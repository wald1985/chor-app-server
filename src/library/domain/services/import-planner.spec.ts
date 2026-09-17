import { LibraryBook } from '../entities/library-book.entity';
import { LibrarySeries } from '../entities/library-series.entity';
import { LibrarySong } from '../entities/library-song.entity';
import { LibraryTheme } from '../entities/library-theme.entity';
import { OptionalText } from '../value-objects/optional-text';
import { SongNumber } from '../value-objects/song-number';
import { SongTitle } from '../value-objects/song-title';
import {
  CatalogSnapshot,
  ImportPlanner,
  validateParsedFile,
} from './import-planner';
import { ParsedLibraryFile } from './import-plan';

describe('ImportPlanner and validateParsedFile (Phase C6)', () => {
  const emptySnapshot: CatalogSnapshot = {
    series: [],
    books: [],
    themes: [],
    songs: [],
  };

  describe('ImportPlanner.plan', () => {
    it('plans empty catalog + 4 books in a series -> CREATE 1 series, 4 books, themes, songs', () => {
      const file: ParsedLibraryFile = {
        books: [1, 2, 3, 4].map((vol) => ({
          title: `Buch ${vol}`,
          series: 'Bücher',
          volume: vol,
          source: { row: vol },
          songs: [
            {
              number: `${vol}01`,
              title: `Lied ${vol}01`,
              author: 'D. M.',
              arranger: null,
              themes: ['Lob und Dank', 'Anbetung'],
              source: { row: vol * 10 + 1 },
            },
            {
              number: `${vol}02`,
              title: `Lied ${vol}02`,
              author: null,
              arranger: 'J. S.',
              themes: ['Gebet'],
              source: { row: vol * 10 + 2 },
            },
          ],
        })),
      };

      const plan = ImportPlanner.plan(file, emptySnapshot);

      expect(plan.errors).toEqual([]);
      const summary = plan.summary();
      expect(summary.seriesCreated).toBe(1);
      expect(summary.booksCreated).toBe(4);
      expect(summary.themesCreated).toBe(3); // 'Lob und Dank', 'Anbetung', 'Gebet'
      expect(summary.songsCreated).toBe(8);
      expect(summary.totalErrors).toBe(0);
      expect(plan.hash()).toBeDefined();
    });

    it('plans same file second time against snapshot -> all UNCHANGED, same hash()', () => {
      const series = LibrarySeries.create({
        id: 's-1',
        title: 'Bücher',
      });
      const book1 = LibraryBook.create({
        id: 'b-1',
        title: 'Buch 1',
        placement: { seriesId: 's-1', volume: 1 },
      });
      const theme1 = LibraryTheme.create({
        id: 't-1',
        name: 'Lob und Dank',
      });
      const song1 = LibrarySong.create(book1, {
        id: 'song-1',
        number: '1',
        title: 'O großer Gott',
        author: 'Author A',
        arranger: null,
        themeIds: ['t-1'],
      });

      const snapshot: CatalogSnapshot = {
        series: [series],
        books: [book1],
        themes: [theme1],
        songs: [song1],
      };

      const file: ParsedLibraryFile = {
        books: [
          {
            title: 'Buch 1',
            series: 'Bücher',
            volume: 1,
            source: { row: 1 },
            songs: [
              {
                number: '1',
                title: 'O großer Gott',
                author: 'Author A',
                arranger: null,
                themes: ['Lob und Dank'],
                source: { row: 2 },
              },
            ],
          },
        ],
      };

      const plan1 = ImportPlanner.plan(file, snapshot);
      const plan2 = ImportPlanner.plan(file, snapshot);

      expect(plan1.errors).toEqual([]);
      const s1 = plan1.summary();
      expect(s1.seriesUnchanged).toBe(1);
      expect(s1.booksUnchanged).toBe(1);
      expect(s1.themesUnchanged).toBe(1);
      expect(s1.songsUnchanged).toBe(1);
      expect(s1.songsCreated).toBe(0);
      expect(s1.songsUpdated).toBe(0);
      expect(plan1.hash()).toBe(plan2.hash());
    });

    it('plans changed title of one song and themes of another -> UPDATE with fields', () => {
      const book = LibraryBook.create({
        id: 'b-1',
        title: 'Buch 1',
        placement: { seriesId: null, volume: null },
      });
      const theme1 = LibraryTheme.create({ id: 't-1', name: 'Thema 1' });
      const theme2 = LibraryTheme.create({ id: 't-2', name: 'Thema 2' });

      const song1 = LibrarySong.create(book, {
        id: 's-1',
        number: '1',
        title: 'Original Title',
        author: null,
        arranger: null,
        themeIds: ['t-1'],
      });
      const song2 = LibrarySong.create(book, {
        id: 's-2',
        number: '2',
        title: 'Title 2',
        author: null,
        arranger: null,
        themeIds: ['t-1'],
      });

      const snapshot: CatalogSnapshot = {
        series: [],
        books: [book],
        themes: [theme1, theme2],
        songs: [song1, song2],
      };

      const file: ParsedLibraryFile = {
        books: [
          {
            title: 'Buch 1',
            series: null,
            volume: null,
            source: { row: 1 },
            songs: [
              {
                number: '1',
                title: 'Updated Title',
                author: null,
                arranger: null,
                themes: ['Thema 1'],
                source: { row: 2 },
              },
              {
                number: '2',
                title: 'Title 2',
                author: null,
                arranger: null,
                themes: ['Thema 2'],
                source: { row: 3 },
              },
            ],
          },
        ],
      };

      const plan = ImportPlanner.plan(file, snapshot);
      expect(plan.errors).toEqual([]);
      expect(plan.summary().songsUpdated).toBe(2);

      const pSong1 = plan.songs.find((s) => s.number === '1')!;
      expect(pSong1.action).toBe('UPDATE');
      expect(pSong1.changes).toEqual(['title']);
      expect(pSong1.title).toBe('Updated Title');

      const pSong2 = plan.songs.find((s) => s.number === '2')!;
      expect(pSong2.action).toBe('UPDATE');
      expect(pSong2.changes).toEqual(['themes']);
      expect(pSong2.themeIds).toEqual(['t-2']);
    });

    it('song number disappears from book -> ARCHIVE; returns -> RESTORE + UPDATE', () => {
      const book = LibraryBook.create({
        id: 'b-1',
        title: 'Buch 1',
        placement: { seriesId: null, volume: null },
      });
      const song1 = LibrarySong.create(book, {
        id: 's-1',
        number: '1',
        title: 'Song One',
        author: null,
        arranger: null,
        themeIds: [],
      });
      const song2 = LibrarySong.create(book, {
        id: 's-2',
        number: '2',
        title: 'Song Two',
        author: null,
        arranger: null,
        themeIds: [],
      });

      const snapshot: CatalogSnapshot = {
        series: [],
        books: [book],
        themes: [],
        songs: [song1, song2],
      };

      // 1. Song 2 is omitted from the file
      const fileWithoutSong2: ParsedLibraryFile = {
        books: [
          {
            title: 'Buch 1',
            series: null,
            volume: null,
            source: { row: 1 },
            songs: [
              {
                number: '1',
                title: 'Song One',
                author: null,
                arranger: null,
                themes: [],
                source: { row: 2 },
              },
            ],
          },
        ],
      };

      const plan1 = ImportPlanner.plan(fileWithoutSong2, snapshot);
      expect(plan1.summary().songsArchived).toBe(1);
      const archivedItem = plan1.songs.find((s) => s.number === '2')!;
      expect(archivedItem.action).toBe('ARCHIVE');
      expect(archivedItem.id).toBe('s-2');
      expect(plan1.archivedRefs()).toEqual([{ type: 'SONG', id: 's-2' }]);

      // 2. Song 2 is archived in DB, now returns in file with updated title
      const archivedSong2 = LibrarySong.reconstitute({
        id: 's-2',
        bookId: 'b-1',
        numberScopeId: 'b-1',
        number: new SongNumber('2'),
        title: new SongTitle('Song Two'),
        author: new OptionalText(null, 'author'),
        arranger: new OptionalText(null, 'arranger'),
        themeIds: [],
        archivedAt: new Date(),
      });

      const snapshotWithArchived: CatalogSnapshot = {
        series: [],
        books: [book],
        themes: [],
        songs: [song1, archivedSong2],
      };

      const fileWithReturnedSong2: ParsedLibraryFile = {
        books: [
          {
            title: 'Buch 1',
            series: null,
            volume: null,
            source: { row: 1 },
            songs: [
              {
                number: '1',
                title: 'Song One',
                author: null,
                arranger: null,
                themes: [],
                source: { row: 2 },
              },
              {
                number: '2',
                title: 'Song Two Returned',
                author: null,
                arranger: null,
                themes: [],
                source: { row: 3 },
              },
            ],
          },
        ],
      };

      const plan2 = ImportPlanner.plan(
        fileWithReturnedSong2,
        snapshotWithArchived,
      );
      expect(plan2.summary().songsRestored).toBe(1);
      const restoredItem = plan2.songs.find((s) => s.number === '2')!;
      expect(restoredItem.action).toBe('RESTORE');
      expect(restoredItem.changes).toEqual(['title']);
      expect(restoredItem.title).toBe('Song Two Returned');
    });

    it('volume boundary shift (song 164 from vol 2 to vol 1, both books in file) -> MOVE', () => {
      const series = LibrarySeries.create({ id: 's-1', title: 'Bücher' });
      const book1 = LibraryBook.create({
        id: 'b-1',
        title: 'Buch 1',
        placement: { seriesId: 's-1', volume: 1 },
      });
      const book2 = LibraryBook.create({
        id: 'b-2',
        title: 'Buch 2',
        placement: { seriesId: 's-1', volume: 2 },
      });

      const song164InBook2 = LibrarySong.create(book2, {
        id: 'song-164',
        number: '164',
        title: 'Song 164',
        author: null,
        arranger: null,
        themeIds: [],
      });

      const snapshot: CatalogSnapshot = {
        series: [series],
        books: [book1, book2],
        themes: [],
        songs: [song164InBook2],
      };

      const file: ParsedLibraryFile = {
        books: [
          {
            title: 'Buch 1',
            series: 'Bücher',
            volume: 1,
            source: { row: 1 },
            songs: [
              {
                number: '164',
                title: 'Song 164',
                author: null,
                arranger: null,
                themes: [],
                source: { row: 2 },
              },
            ],
          },
          {
            title: 'Buch 2',
            series: 'Bücher',
            volume: 2,
            source: { row: 3 },
            songs: [],
          },
        ],
      };

      const plan = ImportPlanner.plan(file, snapshot);
      expect(plan.errors).toEqual([]);
      expect(plan.summary().songsMoved).toBe(1);
      expect(plan.summary().songsArchived).toBe(0);

      const movedSong = plan.songs.find((s) => s.number === '164')!;
      expect(movedSong.action).toBe('MOVE');
      expect(movedSong.id).toBe('song-164');
      expect(movedSong.bookId).toBe('b-1');
      expect(movedSong.oldBookId).toBe('b-2');
    });

    it('volume boundary shift where vol 2 is NOT in file -> NUMBER_SCOPE_CONFLICT', () => {
      const series = LibrarySeries.create({ id: 's-1', title: 'Bücher' });
      const book1 = LibraryBook.create({
        id: 'b-1',
        title: 'Buch 1',
        placement: { seriesId: 's-1', volume: 1 },
      });
      const book2 = LibraryBook.create({
        id: 'b-2',
        title: 'Buch 2',
        placement: { seriesId: 's-1', volume: 2 },
      });

      const song164InBook2 = LibrarySong.create(book2, {
        id: 'song-164',
        number: '164',
        title: 'Song 164',
        author: null,
        arranger: null,
        themeIds: [],
      });

      const snapshot: CatalogSnapshot = {
        series: [series],
        books: [book1, book2],
        themes: [],
        songs: [song164InBook2],
      };

      // File only contains Buch 1; Buch 2 is missing!
      const file: ParsedLibraryFile = {
        books: [
          {
            title: 'Buch 1',
            series: 'Bücher',
            volume: 1,
            source: { row: 1 },
            songs: [
              {
                number: '164',
                title: 'Song 164',
                author: null,
                arranger: null,
                themes: [],
                source: { row: 2 },
              },
            ],
          },
        ],
      };

      const plan = ImportPlanner.plan(file, snapshot);
      expect(plan.errors.length).toBeGreaterThan(0);
      expect(plan.errors[0].code).toBe('NUMBER_SCOPE_CONFLICT');
    });

    it('book in file moved to series with taken numbers from outside book -> NUMBER_SCOPE_CONFLICT', () => {
      const series = LibrarySeries.create({ id: 's-1', title: 'Bücher' });
      const bookOutside = LibraryBook.create({
        id: 'b-outside',
        title: 'Buch Outside',
        placement: { seriesId: 's-1', volume: 1 },
      });
      const bookToMove = LibraryBook.create({
        id: 'b-move',
        title: 'Buch To Move',
        placement: { seriesId: null, volume: null },
      });

      const song42InOutsideBook = LibrarySong.create(bookOutside, {
        id: 's-42-outside',
        number: '42',
        title: 'Song 42',
        author: null,
        arranger: null,
        themeIds: [],
      });

      const snapshot: CatalogSnapshot = {
        series: [series],
        books: [bookOutside, bookToMove],
        themes: [],
        songs: [song42InOutsideBook],
      };

      // File moves Buch To Move into series Bücher as volume 2, but has song 42
      const file: ParsedLibraryFile = {
        books: [
          {
            title: 'Buch To Move',
            series: 'Bücher',
            volume: 2,
            source: { row: 1 },
            songs: [
              {
                number: '42',
                title: 'Conflict Song',
                author: null,
                arranger: null,
                themes: [],
                source: { row: 2 },
              },
            ],
          },
        ],
      };

      const plan = ImportPlanner.plan(file, snapshot);
      expect(plan.errors.length).toBeGreaterThan(0);
      expect(plan.errors[0].code).toBe('NUMBER_SCOPE_CONFLICT');
    });

    it('volume taken by book outside file -> VOLUME_TAKEN', () => {
      const series = LibrarySeries.create({ id: 's-1', title: 'Bücher' });
      const bookOutside = LibraryBook.create({
        id: 'b-outside',
        title: 'Buch 1 Outside',
        placement: { seriesId: 's-1', volume: 1 },
      });

      const snapshot: CatalogSnapshot = {
        series: [series],
        books: [bookOutside],
        themes: [],
        songs: [],
      };

      const file: ParsedLibraryFile = {
        books: [
          {
            title: 'Buch 1 Different Name',
            series: 'Bücher',
            volume: 1,
            source: { row: 1 },
            songs: [],
          },
        ],
      };

      const plan = ImportPlanner.plan(file, snapshot);
      expect(plan.errors.length).toBeGreaterThan(0);
      expect(plan.errors[0].code).toBe('VOLUME_TAKEN');
    });

    it('book title in different case -> book matched, title casing does not change (D8)', () => {
      const book = LibraryBook.create({
        id: 'b-1',
        title: 'Buch der Lieder',
        placement: { seriesId: null, volume: null },
      });

      const snapshot: CatalogSnapshot = {
        series: [],
        books: [book],
        themes: [],
        songs: [],
      };

      const file: ParsedLibraryFile = {
        books: [
          {
            title: 'buch der lieder',
            series: null,
            volume: null,
            source: { row: 1 },
            songs: [],
          },
        ],
      };

      const plan = ImportPlanner.plan(file, snapshot);
      expect(plan.errors).toEqual([]);
      expect(plan.books[0].action).toBe('UNCHANGED');
      expect(plan.books[0].title).toBe('Buch der Lieder'); // Preserved from DB!
    });

    it('archived theme in file -> RESTORE', () => {
      const archivedTheme = LibraryTheme.create({
        id: 't-archived',
        name: 'Alte Themen',
        archivedAt: new Date(),
      });

      const snapshot: CatalogSnapshot = {
        series: [],
        books: [],
        themes: [archivedTheme],
        songs: [],
      };

      const file: ParsedLibraryFile = {
        books: [
          {
            title: 'Buch 1',
            series: null,
            volume: null,
            source: { row: 1 },
            songs: [
              {
                number: '1',
                title: 'Song 1',
                author: null,
                arranger: null,
                themes: ['Alte Themen'],
                source: { row: 2 },
              },
            ],
          },
        ],
      };

      const plan = ImportPlanner.plan(file, snapshot);
      expect(plan.errors).toEqual([]);
      expect(plan.summary().themesRestored).toBe(1);
      const themePlan = plan.themes.find((t) => t.name === 'Alte Themen')!;
      expect(themePlan.action).toBe('RESTORE');
      expect(themePlan.id).toBe('t-archived');
    });

    it('hash() changes when any value changes and does not depend on file row order', () => {
      const fileOrderA: ParsedLibraryFile = {
        books: [
          {
            title: 'Buch 1',
            series: 'Reihe',
            volume: 1,
            source: { row: 1 },
            songs: [
              {
                number: '1',
                title: 'Alpha',
                author: null,
                arranger: null,
                themes: ['T1', 'T2'],
                source: { row: 2 },
              },
              {
                number: '2',
                title: 'Beta',
                author: null,
                arranger: null,
                themes: ['T2'],
                source: { row: 3 },
              },
            ],
          },
          {
            title: 'Buch 2',
            series: 'Reihe',
            volume: 2,
            source: { row: 4 },
            songs: [
              {
                number: '3',
                title: 'Gamma',
                author: null,
                arranger: null,
                themes: ['T1'],
                source: { row: 5 },
              },
            ],
          },
        ],
      };

      // Order of books and songs inverted, themes order inverted
      const fileOrderB: ParsedLibraryFile = {
        books: [
          {
            title: 'Buch 2',
            series: 'Reihe',
            volume: 2,
            source: { row: 10 },
            songs: [
              {
                number: '3',
                title: 'Gamma',
                author: null,
                arranger: null,
                themes: ['T1'],
                source: { row: 11 },
              },
            ],
          },
          {
            title: 'Buch 1',
            series: 'Reihe',
            volume: 1,
            source: { row: 12 },
            songs: [
              {
                number: '2',
                title: 'Beta',
                author: null,
                arranger: null,
                themes: ['T2'],
                source: { row: 13 },
              },
              {
                number: '1',
                title: 'Alpha',
                author: null,
                arranger: null,
                themes: ['T2', 'T1'], // inverted theme order
                source: { row: 14 },
              },
            ],
          },
        ],
      };

      const planA = ImportPlanner.plan(fileOrderA, emptySnapshot);
      const planB = ImportPlanner.plan(fileOrderB, emptySnapshot);

      expect(planA.hash()).toBe(planB.hash());

      // Changing any field changes the hash
      const fileModified: ParsedLibraryFile = {
        ...fileOrderA,
        books: [
          {
            ...fileOrderA.books[0],
            songs: [
              { ...fileOrderA.books[0].songs[0], title: 'Alpha Modified' },
              fileOrderA.books[0].songs[1],
            ],
          },
          fileOrderA.books[1],
        ],
      };
      const planModified = ImportPlanner.plan(fileModified, emptySnapshot);
      expect(planModified.hash()).not.toBe(planA.hash());
    });
  });

  describe('validateParsedFile (D§7.5)', () => {
    it('rejects file with > 20000 songs with TOO_MANY_ROWS', () => {
      const dummySongs = Array.from({ length: 20001 }, (_, i) => ({
        number: `${i + 1}`,
        title: `Song ${i + 1}`,
        author: null,
        arranger: null,
        themes: [],
        source: { row: i + 1 },
      }));

      const errors = validateParsedFile({
        books: [
          {
            title: 'Big Book',
            series: null,
            volume: null,
            songs: dummySongs,
            source: { row: 1 },
          },
        ],
      });

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('TOO_MANY_ROWS');
    });

    it('reports VALUE_REQUIRED for empty book title, song number, song title', () => {
      const errors = validateParsedFile({
        books: [
          {
            title: '   ',
            series: null,
            volume: null,
            source: { row: 1 },
            songs: [
              {
                number: '',
                title: '',
                author: null,
                arranger: null,
                themes: [],
                source: { row: 2 },
              },
            ],
          },
        ],
      });

      const codes = errors.map((e) => e.code);
      expect(codes).toContain('VALUE_REQUIRED');
      expect(errors.filter((e) => e.code === 'VALUE_REQUIRED')).toHaveLength(3);
    });

    it('reports VALUE_INVALID for invalid VO rules (number, volume, | in theme)', () => {
      const errors = validateParsedFile({
        books: [
          {
            title: 'A'.repeat(101), // invalid title length
            series: 'Valid Series',
            volume: 0, // invalid volume
            source: { row: 1 },
            songs: [
              {
                number: 'invalid#number', // invalid format
                title: 'Valid Song',
                author: 'B'.repeat(101), // invalid author length
                arranger: null,
                themes: ['Invalid|Theme'], // pipe in theme
                source: { row: 2 },
              },
            ],
          },
        ],
      });

      const codes = errors.map((e) => e.code);
      expect(codes).toContain('VALUE_INVALID');
      expect(
        errors.filter((e) => e.code === 'VALUE_INVALID').length,
      ).toBeGreaterThanOrEqual(4);
    });

    it('reports BOOK_PLACEMENT_INCONSISTENT for series without volume or volume without series', () => {
      const errors1 = validateParsedFile({
        books: [
          {
            title: 'Buch 1',
            series: 'Series Only',
            volume: null,
            source: { row: 1 },
            songs: [],
          },
        ],
      });
      expect(errors1.map((e) => e.code)).toContain(
        'BOOK_PLACEMENT_INCONSISTENT',
      );

      const errors2 = validateParsedFile({
        books: [
          {
            title: 'Buch 2',
            series: null,
            volume: 1,
            source: { row: 1 },
            songs: [],
          },
        ],
      });
      expect(errors2.map((e) => e.code)).toContain(
        'BOOK_PLACEMENT_INCONSISTENT',
      );

      const errors3 = validateParsedFile({
        books: [
          {
            title: 'Buch 3',
            series: 'Series 1',
            volume: 1,
            source: { row: 1 },
            songs: [],
          },
          {
            title: 'Buch 3',
            series: 'Series 2',
            volume: 2,
            source: { row: 5 },
            songs: [],
          },
        ],
      });
      expect(errors3.map((e) => e.code)).toContain(
        'BOOK_PLACEMENT_INCONSISTENT',
      );
    });

    it('reports DUPLICATE_NUMBER when same song number appears twice in numbering scope', () => {
      const errors = validateParsedFile({
        books: [
          {
            title: 'Buch 1',
            series: 'Gemeinsame Serie',
            volume: 1,
            source: { row: 1 },
            songs: [
              {
                number: '15',
                title: 'Song 15 A',
                author: null,
                arranger: null,
                themes: [],
                source: { row: 2 },
              },
            ],
          },
          {
            title: 'Buch 2',
            series: 'Gemeinsame Serie',
            volume: 2,
            source: { row: 3 },
            songs: [
              {
                number: '15',
                title: 'Song 15 B',
                author: null,
                arranger: null,
                themes: [],
                source: { row: 4 },
              },
            ],
          },
        ],
      });

      const duplicateErrors = errors.filter(
        (e) => e.code === 'DUPLICATE_NUMBER',
      );
      expect(duplicateErrors).toHaveLength(1);
    });

    it('reports DUPLICATE_VOLUME when two books in same series have same volume', () => {
      const errors = validateParsedFile({
        books: [
          {
            title: 'Buch 1',
            series: 'Serie X',
            volume: 1,
            source: { row: 1 },
            songs: [],
          },
          {
            title: 'Buch 2',
            series: 'Serie X',
            volume: 1,
            source: { row: 2 },
            songs: [],
          },
        ],
      });

      const volErrors = errors.filter((e) => e.code === 'DUPLICATE_VOLUME');
      expect(volErrors).toHaveLength(1);
    });

    it('caps reported errors at 200', () => {
      const invalidSongs = Array.from({ length: 250 }, (_, i) => ({
        number: '',
        title: '',
        author: null,
        arranger: null,
        themes: [],
        source: { row: i + 1 },
      }));

      const errors = validateParsedFile({
        books: [
          {
            title: 'Book with invalid songs',
            series: null,
            volume: null,
            source: { row: 1 },
            songs: invalidSongs,
          },
        ],
      });

      expect(errors.length).toBe(200);
    });
  });
});
