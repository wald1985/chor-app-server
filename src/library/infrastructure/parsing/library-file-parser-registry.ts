import { Injectable } from '@nestjs/common';
import type {
  LibraryFileParserRegistry,
  ParseResult,
} from '../../domain/ports/library-file-parser.port';
import { JsonLibraryFileParser } from './json-library-file-parser';
import { CsvLibraryFileParser } from './csv-library-file-parser';
import { XlsxLibraryFileParser } from './xlsx-library-file-parser';

@Injectable()
export class DefaultLibraryFileParserRegistry implements LibraryFileParserRegistry {
  constructor(
    private readonly jsonParser: JsonLibraryFileParser,
    private readonly csvParser: CsvLibraryFileParser,
    private readonly xlsxParser: XlsxLibraryFileParser,
  ) {}

  async parse(buffer: Buffer, filename: string): Promise<ParseResult> {
    const ext = this.getExtension(filename);

    if (ext === '.json') {
      return this.jsonParser.parse(buffer);
    }

    if (ext === '.csv') {
      return this.csvParser.parse(buffer);
    }

    if (ext === '.xlsx') {
      return await this.xlsxParser.parse(buffer);
    }

    if (ext === '.xls' || ext === '.xlsm') {
      return {
        ok: false,
        errors: [
          {
            code: 'FILE_TYPE_UNSUPPORTED',
            message: `File type '${ext}' is not supported. Only .xlsx files are supported.`,
          },
        ],
      };
    }

    return {
      ok: false,
      errors: [
        {
          code: 'FILE_TYPE_UNSUPPORTED',
          message: `Unsupported file type '${ext}'`,
        },
      ],
    };
  }

  private getExtension(filename: string): string {
    const idx = filename.lastIndexOf('.');
    return idx >= 0 ? filename.substring(idx).toLowerCase() : '';
  }
}
