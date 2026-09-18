import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp } from '../utils/create-test-app';
import { createAdmin, createMember, RegisteredAdmin } from '../utils/factories';
import { resetDb } from '../utils/reset-db';

describe('Repertoire (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: RegisteredAdmin;
  let foreignAdmin: RegisteredAdmin;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDb(prisma);
    admin = await createAdmin(app, {
      communityName: 'Choir Community',
      email: 'admin@repertoire-test.com',
    });
    foreignAdmin = await createAdmin(app, {
      communityName: 'Foreign Community',
      email: 'foreign@repertoire-test.com',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Access Control & Guards', () => {
    it('returns 401 when request is not authenticated', async () => {
      await request(app.getHttpServer())
        .get(`/communities/${admin.communityId}/songs`)
        .expect(401);
    });

    it('returns 403 NOT_COMMUNITY_MEMBER when user is not a member of the community', async () => {
      const res = await request(app.getHttpServer())
        .get(`/communities/${admin.communityId}/songs`)
        .set('Authorization', `Bearer ${foreignAdmin.token}`)
        .expect(403);

      expect(res.body).toMatchObject({
        statusCode: 403,
        code: 'NOT_COMMUNITY_MEMBER',
      });
    });

    it('denies mutating operations for a member without REPERTOIRE_MANAGE permission', async () => {
      const member = await createMember(app, prisma, admin.communityId, {
        email: 'member-readonly@test.com',
        permissions: [],
      });

      // Member can read
      await request(app.getHttpServer())
        .get(`/communities/${admin.communityId}/folders`)
        .set('Authorization', `Bearer ${member.token}`)
        .expect(200);

      // Member cannot create folder
      const res = await request(app.getHttpServer())
        .post(`/communities/${admin.communityId}/folders`)
        .set('Authorization', `Bearer ${member.token}`)
        .send({ title: 'Unauthorized Folder' })
        .expect(403);

      expect(res.body).toMatchObject({
        statusCode: 403,
        code: 'PERMISSION_DENIED',
        required: 'REPERTOIRE_MANAGE',
      });
    });

    it('allows mutating operations for a member with REPERTOIRE_MANAGE permission', async () => {
      const memberWithPerm = await createMember(
        app,
        prisma,
        admin.communityId,
        {
          email: 'member-manager@test.com',
          permissions: ['REPERTOIRE_MANAGE'],
        },
      );

      const res = await request(app.getHttpServer())
        .post(`/communities/${admin.communityId}/folders`)
        .set('Authorization', `Bearer ${memberWithPerm.token}`)
        .send({ title: 'Manager Folder' })
        .expect(201);

      expect(res.body).toMatchObject({
        title: 'Manager Folder',
        communityId: admin.communityId,
      });
    });
  });

  describe('Attachments API (/communities/:id/attachments)', () => {
    let bookId: string;

    beforeEach(async () => {
      bookId = randomUUID();
      await prisma.libraryBook.create({
        data: {
          id: bookId,
          title: 'Glaubenslieder',
          titleKey: 'glaubenslieder',
        },
      });
    });

    it('supports attaching, listing, archiving, and detaching books', async () => {
      // 1. Attach book
      const attachRes = await request(app.getHttpServer())
        .post(`/communities/${admin.communityId}/attachments`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ libraryBookId: bookId })
        .expect(201);

      expect(attachRes.body).toMatchObject({
        communityId: admin.communityId,
        libraryBookId: bookId,
        archived: false,
      });
      const attachmentId = attachRes.body.id;

      // 2. Prevent duplicate active attachment
      const dupRes = await request(app.getHttpServer())
        .post(`/communities/${admin.communityId}/attachments`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ libraryBookId: bookId })
        .expect(409);

      expect(dupRes.body).toMatchObject({
        code: 'REPERTOIRE_ATTACHMENT_ALREADY_EXISTS',
      });

      // 3. List attachments
      const listRes = await request(app.getHttpServer())
        .get(`/communities/${admin.communityId}/attachments`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);

      expect(listRes.body).toHaveLength(1);
      expect(listRes.body[0]).toMatchObject({
        id: attachmentId,
        libraryBookId: bookId,
        bookTitle: 'Glaubenslieder',
      });

      // 4. Archive attachment
      await request(app.getHttpServer())
        .post(
          `/communities/${admin.communityId}/attachments/${attachmentId}/archive`,
        )
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(201);

      // List returns active by default
      const listAfterArchive = await request(app.getHttpServer())
        .get(`/communities/${admin.communityId}/attachments`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);

      expect(listAfterArchive.body).toHaveLength(0);

      // 5. Re-attaching restores archived attachment
      const restoreRes = await request(app.getHttpServer())
        .post(`/communities/${admin.communityId}/attachments`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ libraryBookId: bookId })
        .expect(201);

      expect(restoreRes.body.id).toBe(attachmentId);
      expect(restoreRes.body.archived).toBe(false);

      // 6. Detach book (hard delete)
      await request(app.getHttpServer())
        .delete(`/communities/${admin.communityId}/attachments/${attachmentId}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);

      const listAfterDelete = await request(app.getHttpServer())
        .get(`/communities/${admin.communityId}/attachments`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);

      expect(listAfterDelete.body).toHaveLength(0);
    });
  });

  describe('Folders API (/communities/:id/folders)', () => {
    it('supports creating, listing, renaming, and archiving folders', async () => {
      // 1. Create folder
      const createRes = await request(app.getHttpServer())
        .post(`/communities/${admin.communityId}/folders`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ title: 'Youth Songs' })
        .expect(201);

      expect(createRes.body).toMatchObject({
        title: 'Youth Songs',
        communityId: admin.communityId,
        archived: false,
      });
      const folderId = createRes.body.id;

      // 2. Duplicate folder title in same community fails
      const dupRes = await request(app.getHttpServer())
        .post(`/communities/${admin.communityId}/folders`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ title: 'youth songs' })
        .expect(409);

      expect(dupRes.body).toMatchObject({
        code: 'REPERTOIRE_FOLDER_TITLE_CONFLICT',
      });

      // 3. List folders
      const listRes = await request(app.getHttpServer())
        .get(`/communities/${admin.communityId}/folders`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);

      expect(listRes.body).toHaveLength(1);
      expect(listRes.body[0].title).toBe('Youth Songs');

      // 4. Rename folder
      const renameRes = await request(app.getHttpServer())
        .patch(`/communities/${admin.communityId}/folders/${folderId}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ title: 'Choir 2026' })
        .expect(200);

      expect(renameRes.body.title).toBe('Choir 2026');

      // 5. Archive folder
      await request(app.getHttpServer())
        .post(`/communities/${admin.communityId}/folders/${folderId}/archive`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(201);

      const listAfterArchive = await request(app.getHttpServer())
        .get(`/communities/${admin.communityId}/folders`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);

      expect(listAfterArchive.body).toHaveLength(0);
    });
  });

  describe('Folder Songs API (/communities/:id/folders/:folderId/songs)', () => {
    let folderId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post(`/communities/${admin.communityId}/folders`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ title: 'Choir Folder' })
        .expect(201);
      folderId = res.body.id;
    });

    it('supports creating, updating, and archiving folder songs', async () => {
      // 1. Create song in folder
      const createRes = await request(app.getHttpServer())
        .post(`/communities/${admin.communityId}/folders/${folderId}/songs`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          number: '1',
          title: 'Amazing Grace',
          author: 'John Newton',
          arranger: 'Traditional',
          isNew: true,
        })
        .expect(201);

      expect(createRes.body).toMatchObject({
        folderId,
        number: '1',
        title: 'Amazing Grace',
        author: 'John Newton',
        arranger: 'Traditional',
        isNew: true,
        archived: false,
      });
      const songId = createRes.body.id;

      // 2. Duplicate song number in same folder fails
      const dupRes = await request(app.getHttpServer())
        .post(`/communities/${admin.communityId}/folders/${folderId}/songs`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          number: '1',
          title: 'Another Song',
        })
        .expect(409);

      expect(dupRes.body).toMatchObject({
        code: 'REPERTOIRE_FOLDER_SONG_NUMBER_CONFLICT',
        number: '1',
      });

      // 3. Update song
      const updateRes = await request(app.getHttpServer())
        .patch(
          `/communities/${admin.communityId}/folders/${folderId}/songs/${songId}`,
        )
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          title: 'Amazing Grace (Arranged)',
          isNew: false,
        })
        .expect(200);

      expect(updateRes.body.title).toBe('Amazing Grace (Arranged)');
      expect(updateRes.body.isNew).toBe(false);

      // 4. Archive song
      await request(app.getHttpServer())
        .post(
          `/communities/${admin.communityId}/folders/${folderId}/songs/${songId}/archive`,
        )
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(201);

      // Song should not appear in active community songs
      const songsRes = await request(app.getHttpServer())
        .get(`/communities/${admin.communityId}/songs`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);

      expect(songsRes.body.find((s: any) => s.id === songId)).toBeUndefined();
    });
  });

  describe('Themes & Unified Songs Aggregation', () => {
    let bookId: string;
    let folderId: string;
    let librarySongId: string;
    let folderSongId: string;

    beforeEach(async () => {
      // 1. Create library book + song
      bookId = randomUUID();
      await prisma.libraryBook.create({
        data: {
          id: bookId,
          title: 'Liederbuch',
          titleKey: 'liederbuch',
        },
      });

      const libThemeId = randomUUID();
      await prisma.libraryTheme.create({
        data: {
          id: libThemeId,
          name: 'Lob und Dank',
          nameKey: 'lob und dank',
        },
      });

      librarySongId = randomUUID();
      await prisma.librarySong.create({
        data: {
          id: librarySongId,
          bookId,
          numberScopeId: bookId,
          number: '5',
          numberKey: '5',
          sortKey: '0000000005',
          title: 'Lobe den Herrn',
          themes: {
            create: [
              {
                themeId: libThemeId,
              },
            ],
          },
        },
      });

      // 2. Attach book to community
      await request(app.getHttpServer())
        .post(`/communities/${admin.communityId}/attachments`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ libraryBookId: bookId })
        .expect(201);

      // 3. Create folder + song
      const folderRes = await request(app.getHttpServer())
        .post(`/communities/${admin.communityId}/folders`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ title: 'A Folder' })
        .expect(201);
      folderId = folderRes.body.id;

      const folderSongRes = await request(app.getHttpServer())
        .post(`/communities/${admin.communityId}/folders/${folderId}/songs`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          number: '1',
          title: 'A New Day',
          isNew: true,
        })
        .expect(201);
      folderSongId = folderSongRes.body.id;
    });

    it('manages community themes and lists combined themes from library and community', async () => {
      // 1. Create community theme
      const createThemeRes = await request(app.getHttpServer())
        .post(`/communities/${admin.communityId}/themes`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ name: 'Ostern' })
        .expect(201);

      expect(createThemeRes.body).toMatchObject({
        name: 'Ostern',
        communityId: admin.communityId,
      });

      // Duplicate theme fails
      await request(app.getHttpServer())
        .post(`/communities/${admin.communityId}/themes`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ name: 'ostern' })
        .expect(409);

      // 2. List themes returns both library theme and community theme
      const themesRes = await request(app.getHttpServer())
        .get(`/communities/${admin.communityId}/themes`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);

      expect(themesRes.body).toHaveLength(2);
      expect(themesRes.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Lob und Dank',
            source: 'LIBRARY',
          }),
          expect.objectContaining({
            name: 'Ostern',
            source: 'COMMUNITY',
          }),
        ]),
      );
    });

    it('aggregates community songs with correct sources, containers, and theme assignments', async () => {
      // 1. Create community theme and assign to library song
      const themeRes = await request(app.getHttpServer())
        .post(`/communities/${admin.communityId}/themes`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ name: 'Youth' })
        .expect(201);
      const youthThemeId = themeRes.body.id;

      await request(app.getHttpServer())
        .put(`/communities/${admin.communityId}/songs/${librarySongId}/themes`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ themeIds: [youthThemeId] })
        .expect(200);

      // 2. Fetch all songs
      const songsRes = await request(app.getHttpServer())
        .get(`/communities/${admin.communityId}/songs`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);

      expect(songsRes.body).toHaveLength(2);

      // Folder song (Container 'A Folder', number '1') comes first alphabetically
      const firstSong = songsRes.body[0];
      expect(firstSong.id).toBe(folderSongId);
      expect(firstSong.source).toBe('COMMUNITY');
      expect(firstSong.isNew).toBe(true);
      expect(firstSong.container).toMatchObject({
        id: folderId,
        title: 'A Folder',
        type: 'FOLDER',
      });

      // Library song (Container 'Liederbuch', number '5')
      const secondSong = songsRes.body[1];
      expect(secondSong.id).toBe(librarySongId);
      expect(secondSong.source).toBe('LIBRARY');
      expect(secondSong.isNew).toBe(false);
      expect(secondSong.container).toMatchObject({
        id: bookId,
        title: 'Liederbuch',
        type: 'BOOK',
      });
      // Should have both the original library theme and the assigned community theme
      expect(secondSong.themes).toHaveLength(2);
      expect(secondSong.themes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Lob und Dank', source: 'LIBRARY' }),
          expect.objectContaining({ name: 'Youth', source: 'COMMUNITY' }),
        ]),
      );

      // 3. Search filter
      const searchRes = await request(app.getHttpServer())
        .get(`/communities/${admin.communityId}/songs`)
        .query({ search: 'New Day' })
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);

      expect(searchRes.body).toHaveLength(1);
      expect(searchRes.body[0].id).toBe(folderSongId);

      // 4. Container filter
      const containerRes = await request(app.getHttpServer())
        .get(`/communities/${admin.communityId}/songs`)
        .query({ containerId: bookId })
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);

      expect(containerRes.body).toHaveLength(1);
      expect(containerRes.body[0].id).toBe(librarySongId);
    });
  });
});
