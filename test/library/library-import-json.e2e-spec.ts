import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  LIBRARY_USAGE_PROVIDER,
  LibraryUsageProvider,
} from '../../src/library-admin';
import {
  SONG_REPOSITORY,
  SongRepository,
} from '../../src/library/domain/ports/song-repository.port';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp } from '../utils/create-test-app';
import { resetDb } from '../utils/reset-db';

describe('Library JSON Import preview and apply (e2e - Phase C7)', () => {
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

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'admin@example.com',
        password: 'Password123!',
        name: 'Admin User',
        communityName: 'Admin Choir',
      })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'Password123!',
      })
      .expect(200);

    jwtToken = loginRes.body.accessToken;
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

  it('preview -> apply -> reading through /library returns data; repeat preview is UNCHANGED; IDs preserved (NFR-7)', async () => {
    const fileBuffer = Buffer.from(JSON.stringify(baseCatalogJson));

    // 1. Preview
    const previewRes = await request(app.getHttpServer())
      .post('/admin/library/imports/preview')
      .set('Authorization', `Bearer ${jwtToken}`)
      .attach('file', fileBuffer, 'catalog.json')
      .expect(200);

    expect(previewRes.body.format).toBe('JSON');
    expect(previewRes.body.planHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(previewRes.body.summary.books.create).toBe(1);
    expect(previewRes.body.summary.songs.create).toBe(2);
    expect(previewRes.body.requiresConfirmation).toBe(false);

    const planHash = previewRes.body.planHash;

    // 2. Apply
    const applyRes = await request(app.getHttpServer())
      .post('/admin/library/imports/apply')
      .set('Authorization', `Bearer ${jwtToken}`)
      .attach('file', fileBuffer, 'catalog.json')
      .field('planHash', planHash)
      .expect(200);

    expect(applyRes.body.planHash).toBe(planHash);
    expect(applyRes.body.summary.songs.create).toBe(2);

    // 3. Read through /library
    const seriesRes = await request(app.getHttpServer())
      .get('/library/series')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);
    expect(seriesRes.body).toHaveLength(1);
    expect(seriesRes.body[0].title).toBe('Bücher');

    const booksRes = await request(app.getHttpServer())
      .get('/library/books')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);
    expect(booksRes.body).toHaveLength(1);
    expect(booksRes.body[0].title).toBe('Buch 1');
    const bookId = booksRes.body[0].id;

    const bookDetailRes = await request(app.getHttpServer())
      .get(`/library/books/${bookId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);
    expect(bookDetailRes.body.songs).toHaveLength(2);
    const song1 = bookDetailRes.body.songs.find(
      (s: { number: string }) => s.number === '1',
    );
    expect(song1.title).toBe('O großer Gott');
    const song1Id = song1.id;
    const song2Id = bookDetailRes.body.songs.find(
      (s: { number: string }) => s.number === '2',
    ).id;

    // 4. Repeat preview of the same file -> all UNCHANGED
    const repeatPreviewRes = await request(app.getHttpServer())
      .post('/admin/library/imports/preview')
      .set('Authorization', `Bearer ${jwtToken}`)
      .attach('file', fileBuffer, 'catalog.json')
      .expect(200);

    expect(repeatPreviewRes.body.summary.series.create).toBe(0);
    expect(repeatPreviewRes.body.summary.books.unchanged).toBe(1);
    expect(repeatPreviewRes.body.summary.songs.create).toBe(0);
    expect(repeatPreviewRes.body.summary.songs.unchanged).toBe(2);

    const unchangedPlanHash = repeatPreviewRes.body.planHash;

    // 5. Repeat apply of the same file -> check IDs preserved (NFR-7)
    await request(app.getHttpServer())
      .post('/admin/library/imports/apply')
      .set('Authorization', `Bearer ${jwtToken}`)
      .attach('file', fileBuffer, 'catalog.json')
      .field('planHash', unchangedPlanHash)
      .expect(200);

    const reReadBook = await request(app.getHttpServer())
      .get(`/library/books/${bookId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    const reSong1 = reReadBook.body.songs.find(
      (s: { number: string }) => s.number === '1',
    );
    const reSong2 = reReadBook.body.songs.find(
      (s: { number: string }) => s.number === '2',
    );
    expect(reSong1.id).toBe(song1Id);
    expect(reSong2.id).toBe(song2Id);
  });

  it('returns 409 LIBRARY_IMPORT_PLAN_CHANGED when catalog is modified between preview and apply', async () => {
    const fileBuffer = Buffer.from(JSON.stringify(baseCatalogJson));

    // First apply the base catalog
    const p1 = await request(app.getHttpServer())
      .post('/admin/library/imports/preview')
      .set('Authorization', `Bearer ${jwtToken}`)
      .attach('file', fileBuffer, 'catalog.json')
      .expect(200);

    await request(app.getHttpServer())
      .post('/admin/library/imports/apply')
      .set('Authorization', `Bearer ${jwtToken}`)
      .attach('file', fileBuffer, 'catalog.json')
      .field('planHash', p1.body.planHash)
      .expect(200);

    // Now preview the same file again (all UNCHANGED)
    const p2 = await request(app.getHttpServer())
      .post('/admin/library/imports/preview')
      .set('Authorization', `Bearer ${jwtToken}`)
      .attach('file', fileBuffer, 'catalog.json')
      .expect(200);

    const staleHash = p2.body.planHash;

    // Concurrently edit song 2 directly via admin API
    const songsInDb = await prisma.librarySong.findMany();
    const song2 = songsInDb.find((s) => s.number === '2')!;

    await request(app.getHttpServer())
      .patch(`/admin/library/songs/${song2.id}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ title: 'Interfering Edit on Song 2' })
      .expect(200);

    // Now attempt apply with staleHash -> must fail with 409 LIBRARY_IMPORT_PLAN_CHANGED
    const conflictRes = await request(app.getHttpServer())
      .post('/admin/library/imports/apply')
      .set('Authorization', `Bearer ${jwtToken}`)
      .attach('file', fileBuffer, 'catalog.json')
      .field('planHash', staleHash)
      .expect(409);

    expect(conflictRes.body.code).toBe('LIBRARY_IMPORT_PLAN_CHANGED');
    expect(conflictRes.body.planHash).toBeDefined();
    expect(conflictRes.body.planHash).not.toBe(staleHash);
  });

  it('rejects file larger than 5 MB with 413 FILE_TOO_LARGE', async () => {
    // 6 MB buffer
    const largeBuffer = Buffer.alloc(6 * 1024 * 1024, 'a');

    const res = await request(app.getHttpServer())
      .post('/admin/library/imports/preview')
      .set('Authorization', `Bearer ${jwtToken}`)
      .attach('file', largeBuffer, 'huge.json')
      .expect(413);

    expect(res.body.code).toBe('FILE_TOO_LARGE');
  });

  it('rejects invalid file with 400 LIBRARY_FILE_INVALID and error list', async () => {
    const invalidJson = {
      // Missing format
      books: [
        {
          title: '', // empty title
          songs: [],
        },
      ],
    };
    const buffer = Buffer.from(JSON.stringify(invalidJson));

    const res = await request(app.getHttpServer())
      .post('/admin/library/imports/preview')
      .set('Authorization', `Bearer ${jwtToken}`)
      .attach('file', buffer, 'invalid.json')
      .expect(400);

    expect(res.body.code).toBe('LIBRARY_FILE_INVALID');
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it('two parallel apply requests execute without deadlock or duplicate keys', async () => {
    const fileBuffer = Buffer.from(JSON.stringify(baseCatalogJson));

    const previewRes = await request(app.getHttpServer())
      .post('/admin/library/imports/preview')
      .set('Authorization', `Bearer ${jwtToken}`)
      .attach('file', fileBuffer, 'catalog.json')
      .expect(200);

    const planHash = previewRes.body.planHash;

    const [res1, res2] = await Promise.all([
      request(app.getHttpServer())
        .post('/admin/library/imports/apply')
        .set('Authorization', `Bearer ${jwtToken}`)
        .attach('file', fileBuffer, 'catalog.json')
        .field('planHash', planHash),
      request(app.getHttpServer())
        .post('/admin/library/imports/apply')
        .set('Authorization', `Bearer ${jwtToken}`)
        .attach('file', fileBuffer, 'catalog.json')
        .field('planHash', planHash),
    ]);

    const statuses = [res1.status, res2.status];
    // One succeeds with 200; second either succeeds with 200 or gets 409 (LIBRARY_BUSY / PLAN_CHANGED)
    expect(statuses).toContain(200);
    const validOtherStatuses = [200, 409];
    expect(validOtherStatuses).toContain(res1.status);
    expect(validOtherStatuses).toContain(res2.status);

    // Verify catalog has exactly 2 songs and 1 book
    const songs = await prisma.librarySong.findMany();
    expect(songs).toHaveLength(2);
  });

  it('Performance (NFR-5): import of 1,000 songs and repeat preview completes under 5 seconds', async () => {
    const thousandSongs = Array.from({ length: 1000 }, (_, i) => ({
      number: `${i + 1}`,
      title: `Song Number ${i + 1}`,
      author: i % 2 === 0 ? `Author ${i % 10}` : null,
      arranger: null,
      themes: [`Thema ${i % 20}`],
    }));

    const bigCatalog = {
      format: 'chor-app-library/v1',
      books: [
        {
          title: 'Großes Gesangbuch',
          series: null,
          volume: null,
          songs: thousandSongs,
        },
      ],
    };

    const buffer = Buffer.from(JSON.stringify(bigCatalog));

    const start = Date.now();

    const previewRes = await request(app.getHttpServer())
      .post('/admin/library/imports/preview')
      .set('Authorization', `Bearer ${jwtToken}`)
      .attach('file', buffer, 'big.json')
      .expect(200);

    await request(app.getHttpServer())
      .post('/admin/library/imports/apply')
      .set('Authorization', `Bearer ${jwtToken}`)
      .attach('file', buffer, 'big.json')
      .field('planHash', previewRes.body.planHash)
      .expect(200);

    const repeatPreviewRes = await request(app.getHttpServer())
      .post('/admin/library/imports/preview')
      .set('Authorization', `Bearer ${jwtToken}`)
      .attach('file', buffer, 'big.json')
      .expect(200);

    const duration = Date.now() - start;

    expect(repeatPreviewRes.body.summary.songs.unchanged).toBe(1000);
    // Well under 5,000 ms (5s)
    expect(duration).toBeLessThan(5000);
  });

  it('rolls back completely on error at any step of apply (no partial changes in DB)', async () => {
    const fileBuffer = Buffer.from(JSON.stringify(baseCatalogJson));

    const previewRes = await request(app.getHttpServer())
      .post('/admin/library/imports/preview')
      .set('Authorization', `Bearer ${jwtToken}`)
      .attach('file', fileBuffer, 'catalog.json')
      .expect(200);

    const planHash = previewRes.body.planHash;

    // Simulate failure during song creation (after books and series were written)
    const songRepo = app.get<SongRepository>(SONG_REPOSITORY);
    const spy = jest
      .spyOn(songRepo, 'createMany')
      .mockRejectedValueOnce(
        new Error('Artificial simulated error after book write'),
      );

    await request(app.getHttpServer())
      .post('/admin/library/imports/apply')
      .set('Authorization', `Bearer ${jwtToken}`)
      .attach('file', fileBuffer, 'catalog.json')
      .field('planHash', planHash)
      .expect(500);

    spy.mockRestore();

    // Verify DB has NO partial changes (0 series, 0 books, 0 songs)
    const seriesCount = await prisma.librarySeries.count();
    const booksCount = await prisma.libraryBook.count();
    const songsCount = await prisma.librarySong.count();

    expect(seriesCount).toBe(0);
    expect(booksCount).toBe(0);
    expect(songsCount).toBe(0);
  });

  describe('Import archiving with usage warning (confirmInUse)', () => {
    let appWithMockUsage: INestApplication;
    let inUseJwtToken: string;

    beforeAll(async () => {
      const mockUsageProvider: LibraryUsageProvider = {
        countUsage: (refs) =>
          Promise.resolve(
            refs.map((ref) => ({
              ref,
              communities: 2,
              references: 5,
            })),
          ),
      };

      const testApp = await createTestApp((builder) =>
        builder
          .overrideProvider(LIBRARY_USAGE_PROVIDER)
          .useValue(mockUsageProvider),
      );
      appWithMockUsage = testApp.app;
    });

    beforeEach(async () => {
      const p = appWithMockUsage.get(PrismaService);
      await resetDb(p);

      await request(appWithMockUsage.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'inuse@example.com',
          password: 'Password123!',
          name: 'InUse User',
          communityName: 'InUse Choir',
        })
        .expect(201);

      const loginRes = await request(appWithMockUsage.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'inuse@example.com',
          password: 'Password123!',
        })
        .expect(200);

      inUseJwtToken = loginRes.body.accessToken;
    });

    it('returns 409 LIBRARY_ITEM_IN_USE when archiving songs in use without confirmInUse, succeeds with confirmInUse=true', async () => {
      const fileBuffer = Buffer.from(JSON.stringify(baseCatalogJson));

      // 1. Initial import of 2 songs
      const p1 = await request(appWithMockUsage.getHttpServer())
        .post('/admin/library/imports/preview')
        .set('Authorization', `Bearer ${inUseJwtToken}`)
        .attach('file', fileBuffer, 'catalog.json')
        .expect(200);

      await request(appWithMockUsage.getHttpServer())
        .post('/admin/library/imports/apply')
        .set('Authorization', `Bearer ${inUseJwtToken}`)
        .attach('file', fileBuffer, 'catalog.json')
        .field('planHash', p1.body.planHash)
        .expect(200);

      // 2. New file omitting song 2 -> plans to archive song 2
      const fileWithoutSong2 = JSON.parse(JSON.stringify(baseCatalogJson));
      fileWithoutSong2.books[0].songs = [fileWithoutSong2.books[0].songs[0]];
      const buffer2 = Buffer.from(JSON.stringify(fileWithoutSong2));

      const p2 = await request(appWithMockUsage.getHttpServer())
        .post('/admin/library/imports/preview')
        .set('Authorization', `Bearer ${inUseJwtToken}`)
        .attach('file', buffer2, 'catalog.json')
        .expect(200);

      expect(p2.body.requiresConfirmation).toBe(true);
      expect(p2.body.inUse.length).toBeGreaterThan(0);

      // 3. Apply without confirmInUse -> 409 LIBRARY_ITEM_IN_USE
      const errRes = await request(appWithMockUsage.getHttpServer())
        .post('/admin/library/imports/apply')
        .set('Authorization', `Bearer ${inUseJwtToken}`)
        .attach('file', buffer2, 'catalog.json')
        .field('planHash', p2.body.planHash)
        .field('confirmInUse', 'false')
        .expect(409);

      expect(errRes.body.code).toBe('LIBRARY_ITEM_IN_USE');

      // 4. Apply with confirmInUse=true -> 200 OK
      const successRes = await request(appWithMockUsage.getHttpServer())
        .post('/admin/library/imports/apply')
        .set('Authorization', `Bearer ${inUseJwtToken}`)
        .attach('file', buffer2, 'catalog.json')
        .field('planHash', p2.body.planHash)
        .field('confirmInUse', 'true')
        .expect(200);

      expect(successRes.body.summary.songs.archive).toBe(1);
    });

    afterAll(async () => {
      await appWithMockUsage.close();
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
