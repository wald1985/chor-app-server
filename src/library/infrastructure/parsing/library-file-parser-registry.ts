import { Injectable } from '@nestjs/common';
import {
  LibraryFileParserRegistry,
  ParseResult,
} from '../../domain/ports/library-file-parser.port';
import { JsonLibraryFileParser } from './json-library-file-parser';

@Injectable()
export class DefaultLibraryFileParserRegistry implements LibraryFileParserRegistry {
  constructor(private readonly jsonParser: JsonLibraryFileParser) {}

  parse(buffer: Buffer, filename: string): ParseResult {
    const ext = this.getExtension(filename);

    if (ext === '.json') {
      return this.jsonParser.parse(buffer, filename);
    }

    if (ext === '.csv' || ext === '.xlsx') {
      return {
        ok: false,
        errors: [
          {
            code: 'FILE_TYPE_UNSUPPORTED',
            message: `File type '${ext}' is not supported yet`,
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
