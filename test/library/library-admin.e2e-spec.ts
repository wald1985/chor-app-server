import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  LIBRARY_USAGE_PROVIDER,
  LibraryUsageProvider,
} from '../../src/library-admin';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp } from '../utils/create-test-app';
import { resetDb } from '../utils/reset-db';
import { createSuperadmin } from '../utils/superadmin-factories';

describe('Library Admin Editing API & Usage Check (e2e)', () => {
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

  describe('Authentication check (401 without JWT)', () => {
    it('rejects unauthenticated requests to /admin/library/...', async () => {
      await request(app.getHttpServer())
        .post('/admin/library/series')
        .send({ title: 'Serie' })
        .expect(401);

      await request(app.getHttpServer())
        .post('/admin/library/books')
        .send({ title: 'Buch' })
        .expect(401);

      await request(app.getHttpServer())
        .post('/admin/library/themes')
        .send({ name: 'Thema' })
        .expect(401);
    });
  });

  describe('Successful CRUD flows for all catalog entities', () => {
    it('creates, renames, archives, and restores a series', async () => {
      // 1. Create series
      const createRes = await request(app.getHttpServer())
        .post('/admin/library/series')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ title: 'Bücherreihe' })
        .expect(201);

      expect(createRes.body).toMatchObject({
        title: 'Bücherreihe',
        archived: false,
        books: [],
      });
      const seriesId = createRes.body.id;

      // 2. Rename series
      await request(app.getHttpServer())
        .patch(`/admin/library/series/${seriesId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ title: 'Neue Bücherreihe' })
        .expect(200);

      // Verify via GET
      const getRes = await request(app.getHttpServer())
        .get('/library/series')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);
      expect(getRes.body[0].title).toBe('Neue Bücherreihe');

      // 3. Archive series
      await request(app.getHttpServer())
        .post(`/admin/library/series/${seriesId}/archive`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      // Verify archived hidden from normal list
      const afterArchive = await request(app.getHttpServer())
        .get('/library/series')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);
      expect(afterArchive.body).toHaveLength(0);

      // 4. Restore series
      await request(app.getHttpServer())
        .post(`/admin/library/series/${seriesId}/restore`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      const afterRestore = await request(app.getHttpServer())
        .get('/library/series')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);
      expect(afterRestore.body).toHaveLength(1);
    });

    it('creates, updates, places, archives, and restores a book', async () => {
      // Create series first
      const seriesRes = await request(app.getHttpServer())
        .post('/admin/library/series')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ title: 'Chormusik' })
        .expect(201);
      const seriesId = seriesRes.body.id;

      // 1. Create book placed in series
      const bookRes = await request(app.getHttpServer())
        .post('/admin/library/books')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ title: 'Chormusik Band 1', seriesId, volume: 1 })
        .expect(201);

      expect(bookRes.body).toMatchObject({
        title: 'Chormusik Band 1',
        series: { id: seriesId, title: 'Chormusik' },
        volume: 1,
        archived: false,
      });
      const bookId = bookRes.body.id;

      // 2. Patch title
      await request(app.getHttpServer())
        .patch(`/admin/library/books/${bookId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ title: 'Chormusik 1 - Überarbeitet' })
        .expect(200);

      // 3. Move book out of series (seriesId: null, volume: null)
      await request(app.getHttpServer())
        .patch(`/admin/library/books/${bookId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ seriesId: null, volume: null })
        .expect(200);

      const bookGet = await request(app.getHttpServer())
        .get(`/library/books/${bookId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);
      expect(bookGet.body.series).toBeNull();
      expect(bookGet.body.volume).toBeNull();

      // 4. Archive book
      await request(app.getHttpServer())
        .post(`/admin/library/books/${bookId}/archive`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      // 5. Restore book
      await request(app.getHttpServer())
        .post(`/admin/library/books/${bookId}/restore`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);
    });

    it('creates themes, songs, updates songs, and assigns themes', async () => {
      // 1. Create theme
      const themeRes = await request(app.getHttpServer())
        .post('/admin/library/themes')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ name: 'Anbetung' })
        .expect(201);
      const themeId = themeRes.body.id;

      // 2. Patch theme
      await request(app.getHttpServer())
        .patch(`/admin/library/themes/${themeId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ name: 'Lob und Anbetung' })
        .expect(200);

      // 3. Create book
      const bookRes = await request(app.getHttpServer())
        .post('/admin/library/books')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ title: 'Gesangbuch' })
        .expect(201);
      const bookId = bookRes.body.id;

      // 4. Create song with theme
      const songRes = await request(app.getHttpServer())
        .post(`/admin/library/books/${bookId}/songs`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          number: '100',
          title: 'Großer Gott',
          author: 'Ignaz Franz',
          themeIds: [themeId],
        })
        .expect(201);

      expect(songRes.body).toMatchObject({
        number: '100',
        title: 'Großer Gott',
        author: 'Ignaz Franz',
        themes: [{ id: themeId, name: 'Lob und Anbetung' }],
      });
      const songId = songRes.body.id;

      // 5. Patch song (renumber & update title)
      await request(app.getHttpServer())
        .patch(`/admin/library/songs/${songId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ number: '100a', title: 'Großer Gott, wir loben dich' })
        .expect(200);

      const songGet = await request(app.getHttpServer())
        .get(`/library/songs/${songId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);
      expect(songGet.body.number).toBe('100a');
      expect(songGet.body.title).toBe('Großer Gott, wir loben dich');

      // 6. Put themes (clear themes)
      await request(app.getHttpServer())
        .put(`/admin/library/songs/${songId}/themes`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ themeIds: [] })
        .expect(200);

      const songWithoutThemes = await request(app.getHttpServer())
        .get(`/library/songs/${songId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);
      expect(songWithoutThemes.body.themes).toEqual([]);

      // 7. Archive & Restore song
      await request(app.getHttpServer())
        .post(`/admin/library/songs/${songId}/archive`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/admin/library/songs/${songId}/restore`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      // 8. Archive & Restore theme
      await request(app.getHttpServer())
        .post(`/admin/library/themes/${themeId}/archive`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/admin/library/themes/${themeId}/restore`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);
    });
  });

  describe('Error handling & invariants', () => {
    it('fails when placing book into series with song number conflicts (LIBRARY_NUMBER_SCOPE_CONFLICT)', async () => {
      // Create series with Book 1 having song 50
      const sRes = await request(app.getHttpServer())
        .post('/admin/library/series')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ title: 'Reihe' })
        .expect(201);
      const seriesId = sRes.body.id;

      const b1Res = await request(app.getHttpServer())
        .post('/admin/library/books')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ title: 'Band 1', seriesId, volume: 1 })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/admin/library/books/${b1Res.body.id}/songs`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ number: '50', title: 'Lied in Band 1' })
        .expect(201);

      // Create standalone book with song 50
      const b2Res = await request(app.getHttpServer())
        .post('/admin/library/books')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ title: 'Band 2 Solo' })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/admin/library/books/${b2Res.body.id}/songs`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ number: '50', title: 'Lied in Band 2' })
        .expect(201);

      // Attempt to move Band 2 into series as volume 2 -> conflict!
      const errRes = await request(app.getHttpServer())
        .patch(`/admin/library/books/${b2Res.body.id}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ seriesId, volume: 2 })
        .expect(409);

      expect(errRes.body).toMatchObject({
        code: 'LIBRARY_NUMBER_SCOPE_CONFLICT',
        numbers: ['50'],
      });

      // Verify data did not change
      const b2Check = await request(app.getHttpServer())
        .get(`/library/books/${b2Res.body.id}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);
      expect(b2Check.body.series).toBeNull();
    });

    it('fails when archiving series with active books (LIBRARY_SERIES_HAS_ACTIVE_BOOKS)', async () => {
      const sRes = await request(app.getHttpServer())
        .post('/admin/library/series')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ title: 'Volle Reihe' })
        .expect(201);
      const seriesId = sRes.body.id;

      const bRes = await request(app.getHttpServer())
        .post('/admin/library/books')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ title: 'Aktives Buch', seriesId, volume: 1 })
        .expect(201);

      const errRes = await request(app.getHttpServer())
        .post(`/admin/library/series/${seriesId}/archive`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(409);

      expect(errRes.body).toMatchObject({
        code: 'LIBRARY_SERIES_HAS_ACTIVE_BOOKS',
        bookIds: [bRes.body.id],
      });
    });

    it('fails when modifying archived items (LIBRARY_ITEM_ARCHIVED)', async () => {
      const bRes = await request(app.getHttpServer())
        .post('/admin/library/books')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ title: 'Wird archiviert' })
        .expect(201);
      const bookId = bRes.body.id;

      await request(app.getHttpServer())
        .post(`/admin/library/books/${bookId}/archive`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      // Attempt to patch archived book
      const errRes = await request(app.getHttpServer())
        .patch(`/admin/library/books/${bookId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ title: 'Neue Überschrift' })
        .expect(409);

      expect(errRes.body).toMatchObject({
        code: 'LIBRARY_ITEM_ARCHIVED',
        type: 'book',
        id: bookId,
      });
    });
  });

  describe('Usage warning on archive (LIBRARY_ITEM_IN_USE & confirmInUse)', () => {
    let appWithMockUsage: INestApplication;
    let inUseJwtToken: string;

    beforeAll(async () => {
      const mockUsageProvider: LibraryUsageProvider = {
        countUsage: (refs) =>
          Promise.resolve(
            refs.map((ref) => ({
              ref,
              communities: 3,
              references: 1,
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

      const superadmin = await createSuperadmin(appWithMockUsage);
      inUseJwtToken = superadmin.token;
    });

    it('returns 409 LIBRARY_ITEM_IN_USE without confirmation, then archives with confirmInUse=true', async () => {
      // 1. Create a book
      const bRes = await request(appWithMockUsage.getHttpServer())
        .post('/admin/library/books')
        .set('Authorization', `Bearer ${inUseJwtToken}`)
        .send({ title: 'Genutztes Buch' })
        .expect(201);
      const bookId = bRes.body.id;

      // 2. Archive without confirmInUse -> 409
      const errRes = await request(appWithMockUsage.getHttpServer())
        .post(`/admin/library/books/${bookId}/archive`)
        .set('Authorization', `Bearer ${inUseJwtToken}`)
        .expect(409);

      expect(errRes.body).toMatchObject({
        code: 'LIBRARY_ITEM_IN_USE',
        usage: {
          communities: 3,
          references: 1,
        },
      });

      // 3. Archive with confirmInUse=true -> 200
      await request(appWithMockUsage.getHttpServer())
        .post(`/admin/library/books/${bookId}/archive?confirmInUse=true`)
        .set('Authorization', `Bearer ${inUseJwtToken}`)
        .expect(200);
    });

    afterAll(async () => {
      await appWithMockUsage.close();
    });
  });
});
