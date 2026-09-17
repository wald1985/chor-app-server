import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import writeXlsxFile from 'write-excel-file/node';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp } from '../utils/create-test-app';
import { resetDb } from '../utils/reset-db';
import { createSuperadmin } from '../utils/superadmin-factories';

describe('Library XLSX Import preview and apply (e2e - Phase C10)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtToken: string;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDb(prisma);

    // /admin/library requires a superadmin token as of S8 (ADR 0011); it no
    // longer accepts any authenticated user's token.
    const superadmin = await createSuperadmin(app);
    jwtToken = superadmin.token;
  });

  const baseCatalogJson = {
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
            themes: ['Lob und Dank'],
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

  const createXlsxBuffer = async (): Promise<Buffer> => {
    const rows = [
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
        { value: 'Lob und Dank' },
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
    const resWrite = writeXlsxFile(rows, { buffer: true });
    return await resWrite.toBuffer();
  };

  it('XLSX and JSON imports produce the exact same planHash for identical data', async () => {
    const jsonBuffer = Buffer.from(JSON.stringify(baseCatalogJson));
    const xlsxBuffer = await createXlsxBuffer();

    const jsonPreview = await request(app.getHttpServer())
      .post('/admin/library/imports/preview')
      .set('Authorization', `Bearer ${jwtToken}`)
      .attach('file', jsonBuffer, 'catalog.json')
      .expect(200);

    const xlsxPreview = await request(app.getHttpServer())
      .post('/admin/library/imports/preview')
      .set('Authorization', `Bearer ${jwtToken}`)
      .attach('file', xlsxBuffer, 'catalog.xlsx')
      .expect(200);

    expect(jsonPreview.body.format).toBe('JSON');
    expect(xlsxPreview.body.format).toBe('XLSX');
    expect(xlsxPreview.body.planHash).toBe(jsonPreview.body.planHash);
    expect(xlsxPreview.body.summary).toEqual(jsonPreview.body.summary);
  });

  it('preview -> apply with XLSX file -> reads correctly via /library', async () => {
    const xlsxBuffer = await createXlsxBuffer();

    const previewRes = await request(app.getHttpServer())
      .post('/admin/library/imports/preview')
      .set('Authorization', `Bearer ${jwtToken}`)
      .attach('file', xlsxBuffer, 'catalog.xlsx')
      .expect(200);

    expect(previewRes.body.format).toBe('XLSX');
    expect(previewRes.body.summary.books.create).toBe(1);
    expect(previewRes.body.summary.songs.create).toBe(2);

    const planHash = previewRes.body.planHash;

    const applyRes = await request(app.getHttpServer())
      .post('/admin/library/imports/apply')
      .set('Authorization', `Bearer ${jwtToken}`)
      .attach('file', xlsxBuffer, 'catalog.xlsx')
      .field('planHash', planHash)
      .expect(200);

    expect(applyRes.body.planHash).toBe(planHash);
    expect(applyRes.body.summary.songs.create).toBe(2);

    // Verify through read endpoints
    const booksRes = await request(app.getHttpServer())
      .get('/library/books')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);
    expect(booksRes.body).toHaveLength(1);
    expect(booksRes.body[0].title).toBe('Buch 1');

    const bookDetailRes = await request(app.getHttpServer())
      .get(`/library/books/${booksRes.body[0].id}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);
    expect(bookDetailRes.body.songs).toHaveLength(2);
    expect(bookDetailRes.body.songs[0].title).toBe('O großer Gott');
    expect(bookDetailRes.body.songs[0].author).toBe('Carl Boberg');
  });

  it('rejects invalid XLSX file with 400 and returns structured errors', async () => {
    const invalidRows = [
      [{ value: 'book' }, { value: 'number' }],
      [{ value: 'Buch 1' }, { value: 1 }],
    ];
    const resWrite = writeXlsxFile(invalidRows, { buffer: true });
    const invalidBuffer = await resWrite.toBuffer();

    const res = await request(app.getHttpServer())
      .post('/admin/library/imports/preview')
      .set('Authorization', `Bearer ${jwtToken}`)
      .attach('file', invalidBuffer, 'invalid.xlsx')
      .expect(400);

    expect(res.body.code).toBe('LIBRARY_FILE_INVALID');
    expect(res.body.errors).toContainEqual(
      expect.objectContaining({
        code: 'COLUMN_MISSING',
        column: 'title',
      }),
    );
  });
});
