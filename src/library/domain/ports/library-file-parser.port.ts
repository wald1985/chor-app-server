import { ParsedLibraryFile, PlanError } from '../services/import-plan';

export type ParseResult =
  | { ok: true; file: ParsedLibraryFile; format: 'JSON' | 'CSV' | 'XLSX' }
  | { ok: false; errors: PlanError[] };

export interface LibraryFileParser {
  supports(filename: string): boolean;
  parse(buffer: Buffer, filename: string): Promise<ParseResult> | ParseResult;
}

export interface LibraryFileParserRegistry {
  parse(buffer: Buffer, filename: string): Promise<ParseResult> | ParseResult;
}

export const LIBRARY_FILE_PARSER_REGISTRY = Symbol(
  'LIBRARY_FILE_PARSER_REGISTRY',
);
