import { JsonLibraryFileParser } from './json-library-file-parser';
import { CsvLibraryFileParser } from './csv-library-file-parser';
import { XlsxLibraryFileParser } from './xlsx-library-file-parser';
import { DefaultLibraryFileParserRegistry } from './library-file-parser-registry';

describe('JsonLibraryFileParser & DefaultLibraryFileParserRegistry (Phase C7)', () => {
  const parser = new JsonLibraryFileParser();
  const csvParser = new CsvLibraryFileParser();
  const xlsxParser = new XlsxLibraryFileParser();
  const registry = new DefaultLibraryFileParserRegistry(
    parser,
    csvParser,
    xlsxParser,
  );

  describe('JsonLibraryFileParser', () => {
    it('parses valid JSON library file successfully', () => {
      const validJson = {
        format: 'chor-app-library/v1',
        books: [
          {
            title: 'Buch 1',
            series: 'Bücher',
            volume: 1,
            songs: [
              {
                number: '1',
                title: 'O großer Gott',
                author: 'Carl Boberg',
                arranger: null,
                themes: ['Lob und Dank', 'Anbetung'],
              },
            ],
          },
        ],
      };

      const buffer = Buffer.from(JSON.stringify(validJson));
      const result = parser.parse(buffer);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.format).toBe('JSON');
        expect(result.file.books).toHaveLength(1);
        expect(result.file.books[0].title).toBe('Buch 1');
        expect(result.file.books[0].songs[0].number).toBe('1');
        expect(result.file.books[0].songs[0].themes).toEqual([
          'Lob und Dank',
          'Anbetung',
        ]);
      }
    });

    it('rejects JSON without format or with unsupported format', () => {
      const missingFormat = {
        books: [],
      };
      const res1 = parser.parse(Buffer.from(JSON.stringify(missingFormat)));
      expect(res1.ok).toBe(false);
      if (!res1.ok) {
        expect(res1.errors.map((e) => e.code)).toContain(
          'FORMAT_VERSION_UNSUPPORTED',
        );
      }

      const wrongFormat = {
        format: 'chor-app-library/v2',
        books: [],
      };
      const res2 = parser.parse(Buffer.from(JSON.stringify(wrongFormat)));
      expect(res2.ok).toBe(false);
      if (!res2.ok) {
        expect(res2.errors.map((e) => e.code)).toContain(
          'FORMAT_VERSION_UNSUPPORTED',
        );
      }
    });

    it('reports FIELD_UNKNOWN for unknown fields', () => {
      const jsonWithUnknown = {
        format: 'chor-app-library/v1',
        extraTopField: 'foo',
        books: [
          {
            title: 'Buch 1',
            extraBookField: 'bar',
            songs: [
              {
                number: '1',
                title: 'Song 1',
                extraSongField: 'baz',
              },
            ],
          },
        ],
      };

      const res = parser.parse(Buffer.from(JSON.stringify(jsonWithUnknown)));
      expect(res.ok).toBe(false);
      if (!res.ok) {
        const codes = res.errors.map((e) => e.code);
        expect(codes).toContain('FIELD_UNKNOWN');
        const paths = res.errors.map((e) => e.path);
        expect(paths).toContain('extraTopField');
        expect(paths).toContain('books[0].extraBookField');
        expect(paths).toContain('books[0].songs[0].extraSongField');
      }
    });

    it('handles number both as integer and as string', () => {
      const jsonWithNumbers = {
        format: 'chor-app-library/v1',
        books: [
          {
            title: 'Buch 1',
            songs: [
              { number: 42, title: 'Integer Song' },
              { number: '43a', title: 'String Song' },
            ],
          },
        ],
      };

      const res = parser.parse(Buffer.from(JSON.stringify(jsonWithNumbers)));
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.file.books[0].songs[0].number).toBe('42');
        expect(res.file.books[0].songs[1].number).toBe('43a');
      }
    });

    it('does not allow prototype pollution via __proto__', () => {
      const maliciousJson =
        '{"format":"chor-app-library/v1","__proto__":{"polluted":true},"books":[]}';

      const res = parser.parse(Buffer.from(maliciousJson));
      expect(res.ok).toBe(true);
      expect(
        ({} as unknown as { polluted?: boolean }).polluted,
      ).toBeUndefined();
    });

    it('reports FILE_UNREADABLE for malformed JSON or non-object root', () => {
      const malformed = Buffer.from('{ format: "invalid" json }');
      const res1 = parser.parse(malformed);
      expect(res1.ok).toBe(false);
      if (!res1.ok) {
        expect(res1.errors[0].code).toBe('FILE_UNREADABLE');
      }

      const nonObject = Buffer.from(JSON.stringify([1, 2, 3]));
      const res2 = parser.parse(nonObject);
      expect(res2.ok).toBe(false);
      if (!res2.ok) {
        expect(res2.errors[0].code).toBe('FILE_UNREADABLE');
      }
    });
  });

  describe('DefaultLibraryFileParserRegistry', () => {
    it('dispatches .json to JsonLibraryFileParser', async () => {
      const buffer = Buffer.from(
        JSON.stringify({ format: 'chor-app-library/v1', books: [] }),
      );
      const res = await registry.parse(buffer, 'catalog.JSON');
      expect(res.ok).toBe(true);
    });

    it('returns FILE_TYPE_UNSUPPORTED for .xls and .xlsm', async () => {
      const resXls = await registry.parse(Buffer.from(''), 'test.xls');
      expect(resXls.ok).toBe(false);
      if (!resXls.ok) {
        expect(resXls.errors[0].code).toBe('FILE_TYPE_UNSUPPORTED');
      }

      const resXlsm = await registry.parse(Buffer.from(''), 'test.xlsm');
      expect(resXlsm.ok).toBe(false);
      if (!resXlsm.ok) {
        expect(resXlsm.errors[0].code).toBe('FILE_TYPE_UNSUPPORTED');
      }
    });

    it('returns FILE_TYPE_UNSUPPORTED for unknown extensions', async () => {
      const res = await registry.parse(Buffer.from(''), 'data.txt');
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.errors[0].code).toBe('FILE_TYPE_UNSUPPORTED');
      }
    });
  });
});
