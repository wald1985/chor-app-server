import { INestApplication, Inject, Injectable, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import {
  LIBRARY_READER,
  LibraryBookRef,
  LibraryModule,
  LibraryReader,
  LibrarySongRef,
  LibraryThemeRef,
} from '../../src/library';
import { LibraryBook } from '../../src/library/domain/entities/library-book.entity';
import { LibrarySeries } from '../../src/library/domain/entities/library-series.entity';
import { LibrarySong } from '../../src/library/domain/entities/library-song.entity';
import { LibraryTheme } from '../../src/library/domain/entities/library-theme.entity';
import {
  BOOK_REPOSITORY,
  BookRepository,
} from '../../src/library/domain/ports/book-repository.port';
import {
  ID_GENERATOR,
  IdGenerator,
} from '../../src/library/domain/ports/id-generator.port';
import {
  SERIES_REPOSITORY,
  SeriesRepository,
} from '../../src/library/domain/ports/series-repository.port';
import {
  SONG_REPOSITORY,
  SongRepository,
} from '../../src/library/domain/ports/song-repository.port';
import {
  THEME_REPOSITORY,
  ThemeRepository,
} from '../../src/library/domain/ports/theme-repository.port';
import { EMAIL_SENDER } from '../../src/notifications';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp } from '../utils/create-test-app';
import { resetDb } from '../utils/reset-db';

@Injectable()
class ExternalConsumerService {
  constructor(
    @Inject(LIBRARY_READER)
    public readonly reader: LibraryReader,
  ) {}

  async getBooks(ids: string[]): Promise<LibraryBookRef[]> {
    return this.reader.findBooks(ids);
  }

  async getSongs(ids: string[]): Promise<LibrarySongRef[]> {
    return this.reader.findSongs(ids);
  }

  async getThemes(options: {
    includeArchived: boolean;
  }): Promise<LibraryThemeRef[]> {
    return this.reader.listThemes(options);
  }
}

@Module({
  imports: [LibraryModule],
  providers: [ExternalConsumerService],
  exports: [ExternalConsumerService],
})
class ExternalConsumerModule {}

describe('Library Read API & LibraryReader (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let seriesRepo: SeriesRepository;
  let bookRepo: BookRepository;
  let songRepo: SongRepository;
  let themeRepo: ThemeRepository;
  let idGen: IdGenerator;
  let jwtToken: string;

  let testSeries: LibrarySeries;
  let testBook1: LibraryBook;
  let testBook2: LibraryBook;
  let testSong1: LibrarySong;
  let testSong2: LibrarySong;
  let testTheme: LibraryTheme;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    prisma = app.get(PrismaService);
    seriesRepo = app.get<SeriesRepository>(SERIES_REPOSITORY);
    bookRepo = app.get<BookRepository>(BOOK_REPOSITORY);
    songRepo = app.get<SongRepository>(SONG_REPOSITORY);
    themeRepo = app.get<ThemeRepository>(THEME_REPOSITORY);
    idGen = app.get<IdGenerator>(ID_GENERATOR);
  });

  beforeEach(async () => {
    await resetDb(prisma);

    // Register user to obtain JWT
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'reader@example.com',
        password: 'Password123!',
        name: 'Reader User',
        communityName: 'Reading Choir',
      })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'reader@example.com',
        password: 'Password123!',
      })
      .expect(200);

    jwtToken = loginRes.body.accessToken;

    // Seed test library data
    testSeries = LibrarySeries.create({
      id: idGen.generateId(),
      title: 'Bücher',
    });
    await seriesRepo.create(testSeries);

    testBook1 = LibraryBook.create({
      id: idGen.generateId(),
      title: 'Buch 1',
      placement: { seriesId: testSeries.id, volume: 1 },
    });
    testBook2 = LibraryBook.create({
      id: idGen.generateId(),
      title: 'Buch 2',
      placement: { seriesId: testSeries.id, volume: 2 },
    });
    await bookRepo.create(testBook1);
    await bookRepo.create(testBook2);

    testTheme = LibraryTheme.create({
      id: idGen.generateId(),
      name: 'Lob und Dank',
    });
    await themeRepo.create(testTheme);

    testSong1 = LibrarySong.create(testBook1, {
      id: idGen.generateId(),
      number: '1',
      title: 'Erstes Lied',
      themeIds: [testTheme.id],
    });
    testSong2 = LibrarySong.create(testBook2, {
      id: idGen.generateId(),
      number: '200',
      title: 'Laut rühmet Jesu Herrlichkeit!',
      themeIds: [testTheme.id],
    });
    await songRepo.create(testSong1);
    await songRepo.create(testSong2);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication requirements', () => {
    it('returns 401 when unauthenticated', async () => {
      await request(app.getHttpServer()).get('/library/series').expect(401);
      await request(app.getHttpServer()).get('/library/books').expect(401);
      await request(app.getHttpServer())
        .get(`/library/books/${testBook1.id}`)
        .expect(401);
      await request(app.getHttpServer())
        .get('/library/songs/lookup?seriesId=xyz&number=1')
        .expect(401);
      await request(app.getHttpServer())
        .get(`/library/songs/${testSong1.id}`)
        .expect(401);
      await request(app.getHttpServer()).get('/library/themes').expect(401);
    });
  });

  describe('GET /library/series', () => {
    it('returns series list sorted by title matching SeriesView shape', async () => {
      const res = await request(app.getHttpServer())
        .get('/library/series')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        id: testSeries.id,
        title: 'Bücher',
        archived: false,
        books: [
          { id: testBook1.id, title: 'Buch 1', volume: 1, archived: false },
          { id: testBook2.id, title: 'Buch 2', volume: 2, archived: false },
        ],
      });
    });
  });

  describe('GET /library/books', () => {
    it('returns books with series and songCount matching BookSummaryView shape', async () => {
      const res = await request(app.getHttpServer())
        .get('/library/books')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toMatchObject({
        id: testBook1.id,
        title: 'Buch 1',
        series: { id: testSeries.id, title: 'Bücher' },
        volume: 1,
        songCount: 1,
        archived: false,
      });
    });

    it('filters books by seriesId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/library/books?seriesId=${testSeries.id}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(res.body).toHaveLength(2);
    });
  });

  describe('GET /library/books/:bookId', () => {
    it('returns BookView with songs and themes', async () => {
      const res = await request(app.getHttpServer())
        .get(`/library/books/${testBook2.id}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        id: testBook2.id,
        title: 'Buch 2',
        series: { id: testSeries.id, title: 'Bücher' },
        volume: 2,
        archived: false,
        songs: [
          {
            id: testSong2.id,
            number: '200',
            title: 'Laut rühmet Jesu Herrlichkeit!',
            author: null,
            arranger: null,
            themes: [
              { id: testTheme.id, name: 'Lob und Dank', archived: false },
            ],
            archived: false,
          },
        ],
      });
    });

    it('returns 404 LIBRARY_BOOK_NOT_FOUND for unknown bookId', async () => {
      const unknownId = idGen.generateId();
      const res = await request(app.getHttpServer())
        .get(`/library/books/${unknownId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(404);

      expect(res.body).toMatchObject({
        statusCode: 404,
        code: 'LIBRARY_BOOK_NOT_FOUND',
        id: unknownId,
      });
    });
  });

  describe('GET /library/songs/lookup', () => {
    it('rejects lookup without bookId and without seriesId with 400 LIBRARY_LOOKUP_SCOPE_INVALID', async () => {
      const res = await request(app.getHttpServer())
        .get('/library/songs/lookup?number=200')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(400);

      expect(res.body).toMatchObject({
        statusCode: 400,
        code: 'LIBRARY_LOOKUP_SCOPE_INVALID',
      });
    });

    it('rejects lookup with both bookId and seriesId with 400 LIBRARY_LOOKUP_SCOPE_INVALID', async () => {
      const res = await request(app.getHttpServer())
        .get(
          `/library/songs/lookup?number=200&bookId=${testBook1.id}&seriesId=${testSeries.id}`,
        )
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(400);

      expect(res.body).toMatchObject({
        statusCode: 400,
        code: 'LIBRARY_LOOKUP_SCOPE_INVALID',
      });
    });

    it('finds song by seriesId and number matching SongView shape', async () => {
      const res = await request(app.getHttpServer())
        .get(`/library/songs/lookup?seriesId=${testSeries.id}&number=200`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        id: testSong2.id,
        number: '200',
        title: 'Laut rühmet Jesu Herrlichkeit!',
        book: { id: testBook2.id, title: 'Buch 2', volume: 2, archived: false },
        series: { id: testSeries.id, title: 'Bücher' },
        themes: [{ id: testTheme.id, name: 'Lob und Dank', archived: false }],
        archived: false,
      });
    });

    it('returns 404 LIBRARY_SONG_NOT_FOUND when song is not found', async () => {
      const res = await request(app.getHttpServer())
        .get(`/library/songs/lookup?seriesId=${testSeries.id}&number=9999`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(404);

      expect(res.body).toMatchObject({
        statusCode: 404,
        code: 'LIBRARY_SONG_NOT_FOUND',
      });
    });
  });

  describe('GET /library/songs/:songId', () => {
    it('returns song by id matching SongView shape', async () => {
      const res = await request(app.getHttpServer())
        .get(`/library/songs/${testSong1.id}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        id: testSong1.id,
        number: '1',
        title: 'Erstes Lied',
        book: { id: testBook1.id, title: 'Buch 1', volume: 1, archived: false },
        series: { id: testSeries.id, title: 'Bücher' },
        themes: [{ id: testTheme.id, name: 'Lob und Dank', archived: false }],
        archived: false,
      });
    });

    it('returns 404 LIBRARY_SONG_NOT_FOUND for unknown song id', async () => {
      const unknownId = idGen.generateId();
      const res = await request(app.getHttpServer())
        .get(`/library/songs/${unknownId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(404);

      expect(res.body).toMatchObject({
        statusCode: 404,
        code: 'LIBRARY_SONG_NOT_FOUND',
        id: unknownId,
      });
    });
  });

  describe('GET /library/themes', () => {
    it('returns themes with songCount matching ThemeView shape', async () => {
      const res = await request(app.getHttpServer())
        .get('/library/themes')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        id: testTheme.id,
        name: 'Lob und Dank',
        archived: false,
        songCount: 2,
      });
    });
  });

  describe('Module boundary test (LIBRARY_READER imported from barrel)', () => {
    it('external module imports LIBRARY_READER from root barrel and fetches data', async () => {
      const fixture: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true }),
          ExternalConsumerModule,
        ],
      })
        .overrideProvider(EMAIL_SENDER)
        .useValue({ send: jest.fn().mockResolvedValue(undefined) })
        .compile();

      const consumerApp = fixture.createNestApplication();
      await consumerApp.init();

      const consumer = consumerApp.get(ExternalConsumerService);
      const books = await consumer.getBooks([testBook1.id]);
      expect(books).toHaveLength(1);
      expect(books[0]).toMatchObject({
        id: testBook1.id,
        title: 'Buch 1',
        volume: 1,
        archived: false,
      });

      const songs = await consumer.getSongs([testSong2.id]);
      expect(songs).toHaveLength(1);
      expect(songs[0]).toMatchObject({
        id: testSong2.id,
        number: '200',
        title: 'Laut rühmet Jesu Herrlichkeit!',
        seriesId: testSeries.id,
        volume: 2,
      });

      const themes = await consumer.getThemes({ includeArchived: true });
      expect(themes.map((t) => t.id)).toContain(testTheme.id);

      await consumerApp.close();
    });
  });
});
