import { BookArchivedError, SongArchivedError } from '../errors/library.errors';
import { SongNumber } from '../value-objects/song-number';
import { LibraryBook } from './library-book.entity';
import { LibrarySong } from './library-song.entity';

describe('LibrarySong', () => {
  const createTestBook = (opts?: {
    id?: string;
    seriesId?: string | null;
    volume?: number | null;
    archivedAt?: Date | null;
  }) => {
    return LibraryBook.create({
      id: opts?.id ?? 'book-1',
      title: 'Buch 1',
      placement: {
        seriesId: opts?.seriesId ?? 'series-1',
        volume: opts?.volume ?? 1,
      },
      archivedAt: opts?.archivedAt,
    });
  };

  describe('create()', () => {
    it('sets numberScopeId from book and deduplicates themeIds', () => {
      const book = createTestBook({ seriesId: 'series-A', volume: 1 });
      const song = LibrarySong.create(book, {
        id: 'song-1',
        number: '22a',
        title: 'Grosser Gott',
        author: 'Ignaz Franz',
        arranger: null,
        themeIds: ['theme-1', 'theme-2', 'theme-1'],
      });

      expect(song.id).toBe('song-1');
      expect(song.bookId).toBe(book.id);
      expect(song.numberScopeId).toBe('series-A');
      expect(song.numberValue).toBe('22a');
      expect(song.titleValue).toBe('Grosser Gott');
      expect(song.authorValue).toBe('Ignaz Franz');
      expect(song.arrangerValue).toBeNull();
      expect(song.themeIds).toEqual(['theme-1', 'theme-2']);
      expect(song.isArchived).toBe(false);
    });

    it('throws BookArchivedError when attempting to create a song in an archived book', () => {
      const archivedBook = createTestBook({ archivedAt: new Date() });

      expect(() =>
        LibrarySong.create(archivedBook, {
          id: 'song-fail',
          number: 1,
          title: 'Title',
        }),
      ).toThrow(BookArchivedError);
    });
  });

  describe('moveTo()', () => {
    it('preserves numberScopeId when moving to another book of the same series', () => {
      const seriesId = 'series-main';
      const book1 = createTestBook({
        id: 'book-vol-1',
        seriesId,
        volume: 1,
      });
      const book2 = createTestBook({
        id: 'book-vol-2',
        seriesId,
        volume: 2,
      });

      const song = LibrarySong.create(book1, {
        id: 'song-move',
        number: '100',
        title: 'Ein Lied',
      });

      expect(song.bookId).toBe('book-vol-1');
      expect(song.numberScopeId).toBe(seriesId);

      song.moveTo(book2);

      expect(song.bookId).toBe('book-vol-2');
      expect(song.numberScopeId).toBe(seriesId);
    });

    it('updates numberScopeId when moving to a book with different scope (e.g. unplaced book)', () => {
      const bookSeries = createTestBook({
        id: 'book-s',
        seriesId: 'series-x',
        volume: 1,
      });
      const bookSolo = LibraryBook.create({
        id: 'book-solo',
        title: 'Solo Buch',
      });

      const song = LibrarySong.create(bookSeries, {
        id: 'song-move-2',
        number: 10,
        title: 'Solo',
      });

      expect(song.numberScopeId).toBe('series-x');

      song.moveTo(bookSolo);
      expect(song.bookId).toBe('book-solo');
      expect(song.numberScopeId).toBe('book-solo');
    });
  });

  describe('renumber() and update()', () => {
    it('renumber updates number and preserves entity id', () => {
      const book = createTestBook();
      const song = LibrarySong.create(book, {
        id: 'song-stable-id',
        number: '22',
        title: 'Song',
      });

      song.renumber('23b');

      expect(song.id).toBe('song-stable-id');
      expect(song.numberValue).toBe('23b');
      expect(song.numberKey).toBe('23b');
      expect(song.sortKey).toBe('00000023b');

      song.renumber(new SongNumber('24'));
      expect(song.id).toBe('song-stable-id');
      expect(song.numberValue).toBe('24');
    });

    it('update modifies title, author, arranger and allows clearing them', () => {
      const book = createTestBook();
      const song = LibrarySong.create(book, {
        id: 'song-update',
        number: 1,
        title: 'Old Title',
        author: 'Author A',
        arranger: 'Arranger B',
      });

      song.update({
        title: 'New Title',
        author: null,
        arranger: 'New Arranger',
      });

      expect(song.titleValue).toBe('New Title');
      expect(song.authorValue).toBeNull();
      expect(song.arrangerValue).toBe('New Arranger');
    });

    it('setThemes deduplicates themeIds', () => {
      const book = createTestBook();
      const song = LibrarySong.create(book, {
        id: 'song-themes',
        number: 1,
        title: 'Song',
        themeIds: ['t1'],
      });

      song.setThemes(['t2', 't3', 't2', 't1']);
      expect(song.themeIds).toEqual(['t2', 't3', 't1']);
    });
  });

  describe('archive, restore and immutability when archived', () => {
    it('archive and restore are idempotent', () => {
      const book = createTestBook();
      const song = LibrarySong.create(book, {
        id: 'song-arch',
        number: 1,
        title: 'Song',
      });
      const now1 = new Date('2026-05-01');
      const now2 = new Date('2026-06-01');

      // Restore active does nothing
      song.restore();
      expect(song.isArchived).toBe(false);

      // Archive
      song.archive(now1);
      expect(song.isArchived).toBe(true);
      expect(song.archivedAt).toBe(now1);

      // Re-archive preserves original date
      song.archive(now2);
      expect(song.archivedAt).toBe(now1);

      // Restore
      song.restore();
      expect(song.isArchived).toBe(false);
      expect(song.archivedAt).toBeNull();

      // Re-restore
      song.restore();
      expect(song.isArchived).toBe(false);
    });

    it('all mutation methods throw SongArchivedError when song is archived', () => {
      const book = createTestBook();
      const song = LibrarySong.create(book, {
        id: 'song-archived-mut',
        number: 1,
        title: 'Song',
        archivedAt: new Date(),
      });
      const targetBook = createTestBook({ id: 'book-target' });

      expect(() => song.update({ title: 'Try Update' })).toThrow(
        SongArchivedError,
      );
      expect(() => song.renumber(2)).toThrow(SongArchivedError);
      expect(() => song.moveTo(targetBook)).toThrow(SongArchivedError);
      expect(() => song.setThemes(['t1'])).toThrow(SongArchivedError);
      expect(() => song.update({ title: 'Try' })).toThrow(
        expect.objectContaining({ itemType: 'song', id: 'song-archived-mut' }),
      );
    });
  });
});
