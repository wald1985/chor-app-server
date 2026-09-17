import { Injectable } from '@nestjs/common';
import readXlsxFile from 'read-excel-file/node';
import {
  LibraryFileParser,
  ParseResult,
} from '../../domain/ports/library-file-parser.port';
import {
  ParsedBook,
  ParsedLibraryFile,
  ParsedSong,
  PlanError,
} from '../../domain/services/import-plan';

const KNOWN_COLUMNS = new Set([
  'book',
  'number',
  'title',
  'series',
  'volume',
  'author',
  'arranger',
  'themes',
]);

const REQUIRED_COLUMNS = ['book', 'number', 'title'];
const MAX_ROWS_ALLOWED = 20000;

interface RawXlsxRecord {
  record: Record<string, string>;
  line: number;
}

@Injectable()
export class XlsxLibraryFileParser implements LibraryFileParser {
  supports(filename: string): boolean {
    return filename.toLowerCase().endsWith('.xlsx');
  }

  async parse(buffer: Buffer): Promise<ParseResult> {
    let sheets: Array<{
      sheet: string;
      data: Array<Array<string | number | boolean | Date | null>>;
    }>;
    try {
      sheets = (await readXlsxFile(buffer)) as Array<{
        sheet: string;
        data: Array<Array<string | number | boolean | Date | null>>;
      }>;
    } catch {
      return {
        ok: false,
        errors: [
          {
            code: 'FILE_UNREADABLE',
            message: 'Failed to read XLSX file content',
          },
        ],
      };
    }

    if (!Array.isArray(sheets) || sheets.length === 0) {
      return {
        ok: false,
        errors: [
          {
            code: 'FILE_UNREADABLE',
            message: 'XLSX workbook has no sheets',
          },
        ],
      };
    }

    const firstSheetData = sheets[0].data;
    if (!Array.isArray(firstSheetData) || firstSheetData.length === 0) {
      return {
        ok: false,
        errors: [{ code: 'FILE_UNREADABLE', message: 'XLSX sheet is empty' }],
      };
    }

    const rawHeaderRow = firstSheetData[0];
    const headerColumns = (rawHeaderRow ?? []).map((col) =>
      formatCellValue(col).toLowerCase(),
    );

    const errors: PlanError[] = [];
    this.validateHeader(headerColumns, errors);
    if (errors.length > 0) {
      return { ok: false, errors: errors.slice(0, 200) };
    }

    const recordsResult = extractRecords(firstSheetData, headerColumns);
    if ('errors' in recordsResult) {
      return { ok: false, errors: recordsResult.errors };
    }

    const books = this.groupRecordsIntoBooks(recordsResult.records, errors);
    if (errors.length > 0) {
      return { ok: false, errors: errors.slice(0, 200) };
    }

    const file: ParsedLibraryFile = { books };
    return { ok: true, file, format: 'XLSX' };
  }

  private validateHeader(headers: string[], errors: PlanError[]): void {
    for (const h of headers) {
      if (!KNOWN_COLUMNS.has(h)) {
        errors.push({
          code: 'COLUMN_UNKNOWN',
          message: `Unknown column '${h}'`,
          column: h,
          row: 1,
        });
        if (errors.length >= 200) return;
      }
    }

    for (const req of REQUIRED_COLUMNS) {
      if (!headers.includes(req)) {
        errors.push({
          code: 'COLUMN_MISSING',
          message: `Missing required column '${req}'`,
          column: req,
          row: 1,
        });
        if (errors.length >= 200) return;
      }
    }
  }

  private groupRecordsIntoBooks(
    records: RawXlsxRecord[],
    errors: PlanError[],
  ): ParsedBook[] {
    const bookOrder: string[] = [];
    const booksMap = new Map<
      string,
      {
        book: ParsedBook;
        rawSeries: string | null;
        rawVolumeStr: string | null;
      }
    >();

    for (const { record, line } of records) {
      this.processRow(record, line, bookOrder, booksMap, errors);
      if (errors.length >= 200) break;
    }

    return bookOrder.map((key) => booksMap.get(key)!.book);
  }

  private processRow(
    record: Record<string, string>,
    line: number,
    bookOrder: string[],
    booksMap: Map<
      string,
      {
        book: ParsedBook;
        rawSeries: string | null;
        rawVolumeStr: string | null;
      }
    >,
    errors: PlanError[],
  ): void {
    const bookTitle = (record.book ?? '').trim();
    const rawSeries = sanitizeNullable(record.series);
    const rawVolume = sanitizeNullable(record.volume);

    const bookKey = bookTitle.toLowerCase();
    let entry = booksMap.get(bookKey);

    if (!entry) {
      const volumeNum = parseVolume(rawVolume, line, errors);
      const newBook: ParsedBook = {
        title: bookTitle,
        series: rawSeries,
        volume: volumeNum,
        songs: [],
        source: { row: line },
      };
      entry = {
        book: newBook,
        rawSeries,
        rawVolumeStr: rawVolume,
      };
      booksMap.set(bookKey, entry);
      bookOrder.push(bookKey);
    } else {
      checkRowPlacement(entry, rawSeries, rawVolume, line, errors);
    }

    const song = parseSongRow(record, line);
    entry.book.songs.push(song);
  }
}

function extractRecords(
  rows: Array<Array<string | number | boolean | Date | null>>,
  headerColumns: string[],
): { records: RawXlsxRecord[] } | { errors: PlanError[] } {
  const records: RawXlsxRecord[] = [];
  let songCount = 0;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    if (isRowCompletelyEmpty(row)) {
      continue;
    }

    songCount++;
    if (songCount > MAX_ROWS_ALLOWED) {
      return {
        errors: [
          {
            code: 'TOO_MANY_ROWS',
            message: `XLSX file contains more than ${MAX_ROWS_ALLOWED} rows`,
          },
        ],
      };
    }

    const rec: Record<string, string> = {};
    for (let c = 0; c < headerColumns.length; c++) {
      const colName = headerColumns[c];
      rec[colName] = formatCellValue(row[c]);
    }

    records.push({
      record: rec,
      line: r + 1,
    });
  }

  return { records };
}

function isRowCompletelyEmpty(
  row: Array<string | number | boolean | Date | null>,
): boolean {
  for (const cell of row) {
    if (cell !== null && cell !== undefined) {
      const s = formatCellValue(cell);
      if (s !== '') {
        return false;
      }
    }
  }
  return true;
}

function formatCellValue(
  val: string | number | boolean | Date | null | undefined,
): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number') {
    return val.toString();
  }
  if (typeof val === 'boolean') {
    return val ? 'true' : 'false';
  }
  if (val instanceof Date) {
    return val.toISOString();
  }
  return val.trim();
}

function checkRowPlacement(
  entry: { rawSeries: string | null; rawVolumeStr: string | null },
  rawSeries: string | null,
  rawVolume: string | null,
  line: number,
  errors: PlanError[],
): void {
  const seriesMismatch = entry.rawSeries !== rawSeries;
  const volumeMismatch = entry.rawVolumeStr !== rawVolume;

  if (seriesMismatch || volumeMismatch) {
    errors.push({
      code: 'BOOK_PLACEMENT_INCONSISTENT',
      message: 'Inconsistent series or volume for the same book across rows',
      row: line,
    });
  }
}

function parseSongRow(
  record: Record<string, string>,
  line: number,
): ParsedSong {
  const number = (record.number ?? '').trim();
  const title = (record.title ?? '').trim();
  const author = sanitizeNullable(record.author);
  const arranger = sanitizeNullable(record.arranger);
  const rawThemes = sanitizeNullable(record.themes);

  const themes = rawThemes
    ? rawThemes
        .split('|')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
    : [];

  return {
    number,
    title,
    author,
    arranger,
    themes,
    source: { row: line },
  };
}

function parseVolume(
  rawVolume: string | null,
  line: number,
  errors: PlanError[],
): number | null {
  if (rawVolume === null) return null;
  const volNum = Number(rawVolume);
  if (!Number.isInteger(volNum) || volNum <= 0) {
    errors.push({
      code: 'VALUE_INVALID',
      message: `Invalid volume '${rawVolume}'`,
      row: line,
      column: 'volume',
    });
    return null;
  }
  return volNum;
}

function sanitizeNullable(val: string | undefined): string | null {
  if (val === undefined || val === null) return null;
  const trimmed = val.trim();
  return trimmed === '' ? null : trimmed;
}
