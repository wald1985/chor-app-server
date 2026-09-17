import {
  CsvLibraryFileParser,
  detectDelimiter,
} from './csv-library-file-parser';
import { JsonLibraryFileParser } from './json-library-file-parser';
import { XlsxLibraryFileParser } from './xlsx-library-file-parser';
import { DefaultLibraryFileParserRegistry } from './library-file-parser-registry';
import {
  ImportPlanner,
  validateParsedFile,
} from '../../domain/services/import-planner';
import type { CatalogSnapshot } from '../../domain/services/import-planner';

describe('CsvLibraryFileParser & CSV Import (Phase C9)', () => {
  const jsonParser = new JsonLibraryFileParser();
  const csvParser = new CsvLibraryFileParser();
  const xlsxParser = new XlsxLibraryFileParser();
  const registry = new DefaultLibraryFileParserRegistry(
    jsonParser,
    csvParser,
    xlsxParser,
  );

  describe('detectDelimiter', () => {
    it('detects comma delimiter by default', () => {
      expect(detectDelimiter('book,number,title')).toBe(',');
    });

    it('detects semicolon delimiter if semicolon is present and comma is not', () => {
      expect(detectDelimiter('book;number;title')).toBe(';');
    });

    it('ignores commas inside quoted fields when deciding delimiter', () => {
      expect(detectDelimiter('"book,with,comma";number;title')).toBe(';');
    });

    it('falls back to comma if both semicolon and comma exist outside quotes', () => {
      expect(detectDelimiter('book;number,title')).toBe(',');
    });
  });

  describe('CsvLibraryFileParser parsing details', () => {
    it('parses valid comma-delimited CSV', () => {
      const csv = [
        'book,number,title,series,volume,author,arranger,themes',
        'Buch 1,1,"O großer Gott",Bücher,1,Carl Boberg,Arranger,Lob und Dank',
      ].join('\n');

      const res = csvParser.parse(Buffer.from(csv));
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.format).toBe('CSV');
        expect(res.file.books).toHaveLength(1);
        const book = res.file.books[0];
        expect(book.title).toBe('Buch 1');
        expect(book.series).toBe('Bücher');
        expect(book.volume).toBe(1);
        expect(book.songs).toHaveLength(1);
        expect(book.songs[0]).toEqual({
          number: '1',
          title: 'O großer Gott',
          author: 'Carl Boberg',
          arranger: 'Arranger',
          themes: ['Lob und Dank'],
          source: { row: 2 },
        });
      }
    });

    it('parses valid semicolon-delimited CSV with UTF-8 BOM', () => {
      const csv =
        '\ufeffseries;volume;book;number;title;themes\n' +
        'Bücher;1;Buch 1;1;O großer Gott;Lob und Dank\n' +
        'Bücher;4;Buch 4;613;Der Herr segne dich;Gebet|Hochzeit\n';

      const res = csvParser.parse(Buffer.from(csv));
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.format).toBe('CSV');
        expect(res.file.books).toHaveLength(2);
        expect(res.file.books[0].songs[0].themes).toEqual(['Lob und Dank']);
        expect(res.file.books[1].songs[0].themes).toEqual([
          'Gebet',
          'Hochzeit',
        ]);
      }
    });

    it('handles RFC 4180 quotes, quotes inside quotes, commas, newlines in fields, and umlauts', () => {
      const csv =
        'book,number,title,themes\n' +
        '"Buch 1",1,"Halleluja, lobet Gott","Lob und Dank"\n' +
        '"Buch 1",2,"Er sagte: ""Amen""","Anbetung"\n' +
        '"Buch 1",3,"Zeile 1\nZeile 2","Trost|Überwindung"\n' +
        '"Buch 1",4,"Großer Gott, wir loben Dich","Evangelisation, Zuruf"\n';

      const res = csvParser.parse(Buffer.from(csv));
      expect(res.ok).toBe(true);
      if (res.ok) {
        const songs = res.file.books[0].songs;
        expect(songs).toHaveLength(4);
        expect(songs[0].title).toBe('Halleluja, lobet Gott');
        expect(songs[1].title).toBe('Er sagte: "Amen"');
        expect(songs[2].title).toBe('Zeile 1\nZeile 2');
        expect(songs[3].title).toBe('Großer Gott, wir loben Dich');
        expect(songs[3].themes).toEqual(['Evangelisation, Zuruf']);
      }
    });

    it('rejects non-UTF-8 buffer with FILE_UNREADABLE', () => {
      const invalidBuffer = Buffer.from([0xff, 0xfe, 0x00, 0x00]);
      const res = csvParser.parse(invalidBuffer);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.errors[0].code).toBe('FILE_UNREADABLE');
        expect(res.errors[0].message).toContain('valid UTF-8');
      }
    });

    it('rejects malformed CSV with unclosed quote as FILE_UNREADABLE', () => {
      const csv = 'book,number,title\n"Buch 1",1,"Unclosed title';
      const res = csvParser.parse(Buffer.from(csv));
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.errors[0].code).toBe('FILE_UNREADABLE');
      }
    });

    it('reports COLUMN_UNKNOWN for unexpected columns', () => {
      const csv = 'book,number,title,extra_col\nBuch 1,1,Title,val\n';
      const res = csvParser.parse(Buffer.from(csv));
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.errors).toContainEqual(
          expect.objectContaining({
            code: 'COLUMN_UNKNOWN',
            column: 'extra_col',
            row: 1,
          }),
        );
      }
    });

    it('reports COLUMN_MISSING when mandatory column is missing', () => {
      const csv = 'book,number\nBuch 1,1\n';
      const res = csvParser.parse(Buffer.from(csv));
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.errors).toContainEqual(
          expect.objectContaining({
            code: 'COLUMN_MISSING',
            column: 'title',
            row: 1,
          }),
        );
      }
    });

    it('reports BOOK_PLACEMENT_INCONSISTENT when rows for same book disagree on series or volume', () => {
      const csv = [
        'book,number,title,series,volume',
        'Buch 1,1,Title 1,Bücher,1',
        'Buch 1,2,Title 2,Bücher,2',
      ].join('\n');

      const res = csvParser.parse(Buffer.from(csv));
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.errors).toContainEqual(
          expect.objectContaining({
            code: 'BOOK_PLACEMENT_INCONSISTENT',
            row: 3,
          }),
        );
      }
    });

    it('skips completely empty lines while maintaining accurate row line numbers', () => {
      const csv = [
        'book,number,title',
        '',
        'Buch 1,1,Title 1',
        '',
        'Buch 1,2,Title 2',
      ].join('\n');

      const res = csvParser.parse(Buffer.from(csv));
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.file.books[0].songs[0].source).toEqual({ row: 3 });
        expect(res.file.books[0].songs[1].source).toEqual({ row: 5 });
      }
    });
  });

  describe('DefaultLibraryFileParserRegistry with CSV', () => {
    it('delegates .csv files to CsvLibraryFileParser', async () => {
      const csv = 'book,number,title\nBuch 1,1,Title\n';
      const res = await registry.parse(Buffer.from(csv), 'catalog.csv');
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.format).toBe('CSV');
      }
    });
  });

  describe('Equality of ImportPlan hash between CSV and JSON', () => {
    it('produces the exact same planHash for identical catalog data in CSV and JSON', () => {
      const jsonContent = {
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
              {
                number: '2',
                title: 'Großer Gott wir loben dich',
                author: null,
                arranger: null,
                themes: ['Lob und Dank'],
              },
            ],
          },
          {
            title: 'Buch 2',
            series: 'Bücher',
            volume: 2,
            songs: [
              {
                number: '10',
                title: 'Der Herr segne dich',
                author: null,
                arranger: null,
                themes: ['Gebet', 'Segen'],
              },
            ],
          },
        ],
      };

      const csvContent = [
        'series;volume;book;number;title;author;arranger;themes',
        'Bücher;1;Buch 1;1;O großer Gott;Carl Boberg;;Lob und Dank|Anbetung',
        'Bücher;1;Buch 1;2;Großer Gott wir loben dich;;;Lob und Dank',
        'Bücher;2;Buch 2;10;Der Herr segne dich;;;Gebet|Segen',
      ].join('\n');

      const jsonRes = jsonParser.parse(
        Buffer.from(JSON.stringify(jsonContent)),
      );
      const csvRes = csvParser.parse(Buffer.from(csvContent));

      expect(jsonRes.ok).toBe(true);
      expect(csvRes.ok).toBe(true);

      if (jsonRes.ok && csvRes.ok) {
        expect(validateParsedFile(jsonRes.file)).toEqual([]);
        expect(validateParsedFile(csvRes.file)).toEqual([]);

        const emptySnapshot: CatalogSnapshot = {
          series: [],
          books: [],
          themes: [],
          songs: [],
        };

        const jsonPlan = ImportPlanner.plan(jsonRes.file, emptySnapshot);
        const csvPlan = ImportPlanner.plan(csvRes.file, emptySnapshot);

        expect(jsonPlan.errors).toEqual([]);
        expect(csvPlan.errors).toEqual([]);
        expect(csvPlan.hash()).toBe(jsonPlan.hash());
      }
    });
  });
});
