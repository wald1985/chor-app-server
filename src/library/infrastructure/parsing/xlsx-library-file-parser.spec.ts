import writeXlsxFile from 'write-excel-file/node';
import { XlsxLibraryFileParser } from './xlsx-library-file-parser';
import { JsonLibraryFileParser } from './json-library-file-parser';
import { CsvLibraryFileParser } from './csv-library-file-parser';
import { DefaultLibraryFileParserRegistry } from './library-file-parser-registry';
import {
  ImportPlanner,
  validateParsedFile,
} from '../../domain/services/import-planner';
import type { CatalogSnapshot } from '../../domain/services/import-planner';

describe('XlsxLibraryFileParser & XLSX Import (Phase C10)', () => {
  const jsonParser = new JsonLibraryFileParser();
  const csvParser = new CsvLibraryFileParser();
  const xlsxParser = new XlsxLibraryFileParser();
  const registry = new DefaultLibraryFileParserRegistry(
    jsonParser,
    csvParser,
    xlsxParser,
  );

  describe('XlsxLibraryFileParser parsing details', () => {
    it('parses valid XLSX file correctly, including numeric song numbers as strings', async () => {
      const rows = [
        [
          { value: 'book' },
          { value: 'number' },
          { value: 'title' },
          { value: 'series' },
          { value: 'volume' },
          { value: 'author' },
          { value: 'arranger' },
          { value: 'themes' },
        ],
        [
          { value: 'Buch 1' },
          { value: 1 },
          { value: 'O großer Gott' },
          { value: 'Bücher' },
          { value: 1 },
          { value: 'Carl Boberg' },
          { value: null },
          { value: 'Lob und Dank|Anbetung' },
        ],
        [
          { value: 'Buch 1' },
          { value: '22a' },
          { value: 'Song 22a' },
          { value: 'Bücher' },
          { value: 1 },
          { value: null },
          { value: null },
          { value: 'Gebet' },
        ],
      ];

      const resWrite = writeXlsxFile(rows, { buffer: true });
      const buffer = await resWrite.toBuffer();

      const res = await xlsxParser.parse(buffer);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.format).toBe('XLSX');
        expect(res.file.books).toHaveLength(1);
        const book = res.file.books[0];
        expect(book.title).toBe('Buch 1');
        expect(book.series).toBe('Bücher');
        expect(book.volume).toBe(1);
        expect(book.songs).toHaveLength(2);
        expect(book.songs[0]).toEqual({
          number: '1',
          title: 'O großer Gott',
          author: 'Carl Boberg',
          arranger: null,
          themes: ['Lob und Dank', 'Anbetung'],
          source: { row: 2 },
        });
        expect(book.songs[1]).toEqual({
          number: '22a',
          title: 'Song 22a',
          author: null,
          arranger: null,
          themes: ['Gebet'],
          source: { row: 3 },
        });
      }
    });

    it('reads formula cell values using the cached value without evaluating formulas', async () => {
      const rows = [
        [{ value: 'book' }, { value: 'number' }, { value: 'title' }],
        [
          { value: 'Buch 1' },
          { value: 22 },
          { value: 'Original Title', formula: '=A2' },
        ],
      ];

      const resWrite = writeXlsxFile(rows, { buffer: true });
      const buffer = await resWrite.toBuffer();

      const res = await xlsxParser.parse(buffer);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.file.books[0].songs[0].title).toBe('Original Title');
      }
    });

    it('ignores any sheets after the first sheet', async () => {
      const sheet1 = [
        [{ value: 'book' }, { value: 'number' }, { value: 'title' }],
        [{ value: 'Buch 1' }, { value: 1 }, { value: 'Title 1' }],
      ];
      const sheet2 = [[{ value: 'extra_col' }], [{ value: 'ignored' }]];

      const resWrite = writeXlsxFile(
        [
          { name: 'FirstSheet', data: sheet1 },
          { name: 'SecondSheet', data: sheet2 },
        ],
        { buffer: true },
      );
      const buffer = await resWrite.toBuffer();

      const res = await xlsxParser.parse(buffer);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.file.books).toHaveLength(1);
        expect(res.file.books[0].title).toBe('Buch 1');
      }
    });

    it('returns FILE_UNREADABLE on corrupted or non-zip buffer', async () => {
      const corruptedBuffer = Buffer.from('not an excel file');
      const res = await xlsxParser.parse(corruptedBuffer);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.errors[0].code).toBe('FILE_UNREADABLE');
      }
    });

    it('returns TOO_MANY_ROWS if sheet contains > 20,000 song rows', async () => {
      const rows: Array<Array<{ value: unknown }>> = [
        [{ value: 'book' }, { value: 'number' }, { value: 'title' }],
      ];
      for (let i = 1; i <= 20001; i++) {
        rows.push([{ value: 'Buch 1' }, { value: i }, { value: `Title ${i}` }]);
      }

      const resWrite = writeXlsxFile(rows, { buffer: true });
      const buffer = await resWrite.toBuffer();

      const res = await xlsxParser.parse(buffer);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.errors[0].code).toBe('TOO_MANY_ROWS');
      }
    });

    it('reports COLUMN_UNKNOWN for unexpected columns and COLUMN_MISSING for missing mandatory columns', async () => {
      const rows = [
        [{ value: 'book' }, { value: 'number' }, { value: 'extra_column' }],
        [{ value: 'Buch 1' }, { value: 1 }, { value: 'extra' }],
      ];

      const resWrite = writeXlsxFile(rows, { buffer: true });
      const buffer = await resWrite.toBuffer();

      const res = await xlsxParser.parse(buffer);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.errors).toContainEqual(
          expect.objectContaining({
            code: 'COLUMN_UNKNOWN',
            column: 'extra_column',
            row: 1,
          }),
        );
        expect(res.errors).toContainEqual(
          expect.objectContaining({
            code: 'COLUMN_MISSING',
            column: 'title',
            row: 1,
          }),
        );
      }
    });
  });

  describe('DefaultLibraryFileParserRegistry with XLSX and unsupported types', () => {
    it('dispatches .xlsx files to XlsxLibraryFileParser', async () => {
      const rows = [
        [{ value: 'book' }, { value: 'number' }, { value: 'title' }],
        [{ value: 'Buch 1' }, { value: 1 }, { value: 'Title' }],
      ];
      const resWrite = writeXlsxFile(rows, { buffer: true });
      const buffer = await resWrite.toBuffer();

      const res = await registry.parse(buffer, 'catalog.xlsx');
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.format).toBe('XLSX');
      }
    });

    it('rejects .xls and .xlsm with FILE_TYPE_UNSUPPORTED', async () => {
      const res1 = await registry.parse(Buffer.from(''), 'old.xls');
      expect(res1.ok).toBe(false);
      if (!res1.ok) {
        expect(res1.errors[0].code).toBe('FILE_TYPE_UNSUPPORTED');
      }

      const res2 = await registry.parse(Buffer.from(''), 'macro.xlsm');
      expect(res2.ok).toBe(false);
      if (!res2.ok) {
        expect(res2.errors[0].code).toBe('FILE_TYPE_UNSUPPORTED');
      }
    });
  });

  describe('Equality of ImportPlan hash across JSON, CSV, and XLSX', () => {
    it('produces the exact same planHash for identical catalog data in XLSX, CSV, and JSON', async () => {
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
        ],
      };

      const csvContent = [
        'series;volume;book;number;title;author;arranger;themes',
        'Bücher;1;Buch 1;1;O großer Gott;Carl Boberg;;Lob und Dank|Anbetung',
        'Bücher;1;Buch 1;2;Großer Gott wir loben dich;;;Lob und Dank',
      ].join('\n');

      const xlsxRows = [
        [
          { value: 'series' },
          { value: 'volume' },
          { value: 'book' },
          { value: 'number' },
          { value: 'title' },
          { value: 'author' },
          { value: 'arranger' },
          { value: 'themes' },
        ],
        [
          { value: 'Bücher' },
          { value: 1 },
          { value: 'Buch 1' },
          { value: 1 },
          { value: 'O großer Gott' },
          { value: 'Carl Boberg' },
          { value: null },
          { value: 'Lob und Dank|Anbetung' },
        ],
        [
          { value: 'Bücher' },
          { value: 1 },
          { value: 'Buch 1' },
          { value: 2 },
          { value: 'Großer Gott wir loben dich' },
          { value: null },
          { value: null },
          { value: 'Lob und Dank' },
        ],
      ];

      const resWrite = writeXlsxFile(xlsxRows, { buffer: true });
      const xlsxBuffer = await resWrite.toBuffer();

      const jsonRes = jsonParser.parse(
        Buffer.from(JSON.stringify(jsonContent)),
      );
      const csvRes = csvParser.parse(Buffer.from(csvContent));
      const xlsxRes = await xlsxParser.parse(xlsxBuffer);

      expect(jsonRes.ok).toBe(true);
      expect(csvRes.ok).toBe(true);
      expect(xlsxRes.ok).toBe(true);

      if (jsonRes.ok && csvRes.ok && xlsxRes.ok) {
        expect(validateParsedFile(jsonRes.file)).toEqual([]);
        expect(validateParsedFile(csvRes.file)).toEqual([]);
        expect(validateParsedFile(xlsxRes.file)).toEqual([]);

        const emptySnapshot: CatalogSnapshot = {
          series: [],
          books: [],
          themes: [],
          songs: [],
        };

        const jsonPlan = ImportPlanner.plan(jsonRes.file, emptySnapshot);
        const csvPlan = ImportPlanner.plan(csvRes.file, emptySnapshot);
        const xlsxPlan = ImportPlanner.plan(xlsxRes.file, emptySnapshot);

        expect(jsonPlan.errors).toEqual([]);
        expect(csvPlan.errors).toEqual([]);
        expect(xlsxPlan.errors).toEqual([]);

        expect(csvPlan.hash()).toBe(jsonPlan.hash());
        expect(xlsxPlan.hash()).toBe(jsonPlan.hash());
      }
    });
  });
});
