import { Injectable } from '@nestjs/common';
import { parse as parseCsvSync } from 'csv-parse/sync';
import type {
  LibraryFileParser,
  ParseResult,
} from '../../domain/ports/library-file-parser.port';
import type {
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

interface RawCsvRecord {
  record: Record<string, string>;
  line: number;
}

@Injectable()
export class CsvLibraryFileParser implements LibraryFileParser {
  supports(filename: string): boolean {
    return filename.toLowerCase().endsWith('.csv');
  }

  parse(buffer: Buffer): ParseResult {
    let text: string;
    try {
      const decoder = new TextDecoder('utf-8', { fatal: true });
      text = decoder.decode(buffer);
    } catch {
      return {
        ok: false,
        errors: [
          {
            code: 'FILE_UNREADABLE',
            message: 'File is not valid UTF-8 encoded text',
          },
        ],
      };
    }

    const cleanText = text.replace(/^\uFEFF/, '');
    const firstLine = getFirstNonEmptyLine(cleanText);
    if (!firstLine) {
      return {
        ok: false,
        errors: [{ code: 'FILE_UNREADABLE', message: 'CSV file is empty' }],
      };
    }

    const delimiter = detectDelimiter(firstLine);
    const rawRecords = this.parseRawCsv(cleanText, delimiter);
    if ('errors' in rawRecords) {
      return { ok: false, errors: rawRecords.errors };
    }

    const { headerColumns, records } = rawRecords;
    const errors: PlanError[] = [];

    this.validateHeader(headerColumns, errors);
    if (errors.length > 0) {
      return { ok: false, errors: errors.slice(0, 200) };
    }

    const books = this.groupRecordsIntoBooks(records, errors);
    if (errors.length > 0) {
      return { ok: false, errors: errors.slice(0, 200) };
    }

    const file: ParsedLibraryFile = { books };
    return { ok: true, file, format: 'CSV' };
  }

  private parseRawCsv(
    text: string,
    delimiter: string,
  ):
    | {
        headerColumns: string[];
        records: RawCsvRecord[];
      }
    | { errors: PlanError[] } {
    let headerColumns: string[] = [];
    try {
      const rawRows: Array<{
        record: Record<string, string>;
        info: { lines: number };
      }> = parseCsvSync(text, {
        delimiter,
        bom: true,
        skip_empty_lines: true,
        info: true,
        columns: (header: string[]) => {
          headerColumns = header.map((h) => h.trim().toLowerCase());
          return headerColumns;
        },
      });

      const records: RawCsvRecord[] = rawRows.map((row) => ({
        record: row.record,
        line: row.info.lines,
      }));

      return { headerColumns, records };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        errors: [
          {
            code: 'FILE_UNREADABLE',
            message: `Malformed CSV content: ${msg}`,
          },
        ],
      };
    }
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
    records: RawCsvRecord[],
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

function getFirstNonEmptyLine(text: string): string | null {
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (line.trim().length > 0) return line;
  }
  return null;
}

export function detectDelimiter(firstLine: string): string {
  let insideQuotes = false;
  let hasSemicolon = false;
  let hasComma = false;

  for (let i = 0; i < firstLine.length; i++) {
    const ch = firstLine[i];
    if (ch === '"') {
      if (insideQuotes && firstLine[i + 1] === '"') {
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (!insideQuotes) {
      if (ch === ';') hasSemicolon = true;
      if (ch === ',') hasComma = true;
    }
  }

  if (hasSemicolon && !hasComma) {
    return ';';
  }
  return ',';
}
