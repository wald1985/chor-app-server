import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp } from '../utils/create-test-app';
import { resetDb } from '../utils/reset-db';
import { createSuperadmin } from '../utils/superadmin-factories';

describe('Library CSV Import preview and apply (e2e - Phase C9)', () => {
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

  const baseCatalogCsv = [
    'series;volume;book;number;title;author;arranger;themes',
    'Bücher;1;Buch 1;1;O großer Gott;Carl Boberg;;Lob und Dank',
    'Bücher;1;Buch 1;2;Großer Gott wir loben dich;;;Lob und Dank',
  ].join('\n');

  it('CSV and JSON imports produce the exact same planHash for identical data', async () => {
    const jsonBuffer = Buffer.from(JSON.stringify(baseCatalogJson));
    const csvBuffer = Buffer.from(baseCatalogCsv);

    const jsonPreview = await request(app.getHttpServer())
      .post('/admin/library/imports/preview')
      .set('Authorization', `Bearer ${jwtToken}`)
      .attach('file', jsonBuffer, 'catalog.json')
      .expect(200);

    const csvPreview = await request(app.getHttpServer())
      .post('/admin/library/imports/preview')
      .set('Authorization', `Bearer ${jwtToken}`)
      .attach('file', csvBuffer, 'catalog.csv')
      .expect(200);

    expect(jsonPreview.body.format).toBe('JSON');
    expect(csvPreview.body.format).toBe('CSV');
    expect(csvPreview.body.planHash).toBe(jsonPreview.body.planHash);
    expect(csvPreview.body.summary).toEqual(jsonPreview.body.summary);
  });

  it('preview -> apply with CSV file -> reads correctly via /library', async () => {
    const csvBuffer = Buffer.from(baseCatalogCsv);

    const previewRes = await request(app.getHttpServer())
      .post('/admin/library/imports/preview')
      .set('Authorization', `Bearer ${jwtToken}`)
      .attach('file', csvBuffer, 'catalog.csv')
      .expect(200);

    expect(previewRes.body.format).toBe('CSV');
    expect(previewRes.body.summary.books.create).toBe(1);
    expect(previewRes.body.summary.songs.create).toBe(2);

    const planHash = previewRes.body.planHash;

    const applyRes = await request(app.getHttpServer())
      .post('/admin/library/imports/apply')
      .set('Authorization', `Bearer ${jwtToken}`)
      .attach('file', csvBuffer, 'catalog.csv')
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

  it('rejects invalid CSV file with 400 and returns structured errors', async () => {
    const invalidCsv = 'book,number\nBuch 1,1\n';

    const res = await request(app.getHttpServer())
      .post('/admin/library/imports/preview')
      .set('Authorization', `Bearer ${jwtToken}`)
      .attach('file', Buffer.from(invalidCsv), 'invalid.csv')
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
