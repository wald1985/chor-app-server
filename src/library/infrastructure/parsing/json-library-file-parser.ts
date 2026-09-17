import { Injectable } from '@nestjs/common';
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

const FORMAT_VERSION = 'chor-app-library/v1';
const KNOWN_TOP_KEYS = new Set(['format', 'books']);
const KNOWN_BOOK_KEYS = new Set(['title', 'series', 'volume', 'songs']);
const KNOWN_SONG_KEYS = new Set([
  'number',
  'title',
  'author',
  'arranger',
  'themes',
]);

@Injectable()
export class JsonLibraryFileParser implements LibraryFileParser {
  supports(filename: string): boolean {
    return filename.toLowerCase().endsWith('.json');
  }

  parse(buffer: Buffer): ParseResult {
    let raw: unknown;
    try {
      raw = JSON.parse(buffer.toString('utf-8'));
    } catch {
      return {
        ok: false,
        errors: [{ code: 'FILE_UNREADABLE', message: 'Malformed JSON file' }],
      };
    }

    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      return {
        ok: false,
        errors: [
          {
            code: 'FILE_UNREADABLE',
            message: 'Root JSON value must be an object',
          },
        ],
      };
    }

    const errors: PlanError[] = [];
    const rootObj = raw as Record<string, unknown>;

    validateFormat(rootObj, errors);
    checkUnknownKeys(rootObj, KNOWN_TOP_KEYS, '', errors);
    const books = parseBooks(rootObj.books, errors);

    if (errors.length > 0) {
      return { ok: false, errors: errors.slice(0, 200) };
    }

    const file: ParsedLibraryFile = { books };
    return { ok: true, file, format: 'JSON' };
  }
}

function validateFormat(
  obj: Record<string, unknown>,
  errors: PlanError[],
): void {
  if (obj.format !== FORMAT_VERSION) {
    errors.push({
      code: 'FORMAT_VERSION_UNSUPPORTED',
      message: `Expected format '${FORMAT_VERSION}', got '${String(obj.format)}'`,
      path: 'format',
    });
  }
}

function checkUnknownKeys(
  obj: Record<string, unknown>,
  known: Set<string>,
  prefix: string,
  errors: PlanError[],
): void {
  for (const key of Object.keys(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    if (!known.has(key)) {
      const p = prefix ? `${prefix}.${key}` : key;
      errors.push({
        code: 'FIELD_UNKNOWN',
        message: `Unknown field '${key}'`,
        path: p,
      });
      if (errors.length >= 200) return;
    }
  }
}

function parseBooks(rawBooks: unknown, errors: PlanError[]): ParsedBook[] {
  if (!Array.isArray(rawBooks)) {
    errors.push({
      code: 'FIELD_UNKNOWN',
      message: "Field 'books' must be an array",
      path: 'books',
    });
    return [];
  }

  const list = rawBooks as unknown[];
  const books: ParsedBook[] = [];
  for (let i = 0; i < list.length; i++) {
    const rawBook = list[i];
    const path = `books[${i}]`;
    if (rawBook === null || typeof rawBook !== 'object') {
      errors.push({
        code: 'VALUE_INVALID',
        message: `Book at ${path} must be an object`,
        path,
      });
      continue;
    }
    const book = parseSingleBook(
      rawBook as Record<string, unknown>,
      path,
      errors,
    );
    if (book) books.push(book);
    if (errors.length >= 200) break;
  }
  return books;
}

function parseSingleBook(
  raw: Record<string, unknown>,
  path: string,
  errors: PlanError[],
): ParsedBook | null {
  checkUnknownKeys(raw, KNOWN_BOOK_KEYS, path, errors);

  const title = typeof raw.title === 'string' ? raw.title : '';
  const series =
    typeof raw.series === 'string'
      ? raw.series
      : ((raw.series as null) ?? null);
  const volume =
    typeof raw.volume === 'number'
      ? raw.volume
      : ((raw.volume as null) ?? null);

  const songs = parseSongs(raw.songs, path, errors);
  return {
    title,
    series,
    volume,
    songs,
    source: { path },
  };
}

function parseSongs(
  rawSongs: unknown,
  bookPath: string,
  errors: PlanError[],
): ParsedSong[] {
  if (!Array.isArray(rawSongs)) {
    errors.push({
      code: 'VALUE_INVALID',
      message: `Field 'songs' in ${bookPath} must be an array`,
      path: `${bookPath}.songs`,
    });
    return [];
  }

  const list = rawSongs as unknown[];
  const songs: ParsedSong[] = [];
  for (let j = 0; j < list.length; j++) {
    const rawSong = list[j];
    const songPath = `${bookPath}.songs[${j}]`;
    if (rawSong === null || typeof rawSong !== 'object') {
      errors.push({
        code: 'VALUE_INVALID',
        message: `Song at ${songPath} must be an object`,
        path: songPath,
      });
      continue;
    }
    const song = parseSingleSong(
      rawSong as Record<string, unknown>,
      songPath,
      errors,
    );
    if (song) songs.push(song);
    if (errors.length >= 200) break;
  }
  return songs;
}

function parseSingleSong(
  raw: Record<string, unknown>,
  path: string,
  errors: PlanError[],
): ParsedSong | null {
  checkUnknownKeys(raw, KNOWN_SONG_KEYS, path, errors);

  let numberStr = '';
  if (typeof raw.number === 'string') {
    numberStr = raw.number;
  } else if (typeof raw.number === 'number') {
    numberStr = raw.number.toString();
  }

  const title = typeof raw.title === 'string' ? raw.title : '';
  const author = typeof raw.author === 'string' ? raw.author : null;
  const arranger = typeof raw.arranger === 'string' ? raw.arranger : null;
  const themes = extractThemes(raw.themes, path, errors);

  return {
    number: numberStr,
    title,
    author,
    arranger,
    themes,
    source: { path },
  };
}

function extractThemes(
  rawThemes: unknown,
  path: string,
  errors: PlanError[],
): string[] {
  if (rawThemes === undefined || rawThemes === null) {
    return [];
  }
  if (!Array.isArray(rawThemes)) {
    errors.push({
      code: 'VALUE_INVALID',
      message: `Themes at ${path} must be an array of strings`,
      path: `${path}.themes`,
    });
    return [];
  }
  const result: string[] = [];
  for (const t of rawThemes) {
    if (typeof t === 'string') {
      result.push(t);
    } else {
      errors.push({
        code: 'VALUE_INVALID',
        message: `Theme in ${path} must be a string`,
        path: `${path}.themes`,
      });
    }
  }
  return result;
}
