import { BookArchivedError } from '../errors/library.errors';
import { BookPlacement } from '../value-objects/book-placement';
import { LibraryBook } from './library-book.entity';

describe('LibraryBook', () => {
  describe('numberScopeId()', () => {
    it('returns seriesId when book is placed in a series', () => {
      const book = LibraryBook.create({
        id: 'book-1',
        title: 'Buch 1',
        placement: { seriesId: 'series-xyz', volume: 1 },
      });

      expect(book.numberScopeId()).toBe('series-xyz');
      expect(book.seriesId).toBe('series-xyz');
      expect(book.volumeValue).toBe(1);
    });

    it('returns book id when book has no series (independent book)', () => {
      const book = LibraryBook.create({
        id: 'book-independent',
        title: 'Einzelliederbuch',
        placement: BookPlacement.unplaced(),
      });

      expect(book.numberScopeId()).toBe('book-independent');
      expect(book.seriesId).toBeNull();
      expect(book.volume).toBeNull();
    });

    it('defaults to unplaced when placement is not provided', () => {
      const book = LibraryBook.create({
        id: 'book-2',
        title: 'Buch 2',
      });

      expect(book.numberScopeId()).toBe('book-2');
      expect(book.seriesId).toBeNull();
      expect(book.volume).toBeNull();
    });
  });

  describe('placement and renaming', () => {
    it('updates placement via place()', () => {
      const book = LibraryBook.create({
        id: 'book-1',
        title: 'Buch 1',
      });

      book.place(new BookPlacement({ seriesId: 'series-1', volume: 2 }));
      expect(book.seriesId).toBe('series-1');
      expect(book.volumeValue).toBe(2);
      expect(book.numberScopeId()).toBe('series-1');

      book.place(BookPlacement.unplaced());
      expect(book.seriesId).toBeNull();
      expect(book.volume).toBeNull();
      expect(book.numberScopeId()).toBe('book-1');
    });

    it('renames book when active', () => {
      const book = LibraryBook.create({
        id: 'book-1',
        title: 'Buch 1',
      });

      book.rename('Buch 1 (revidiert)');
      expect(book.title.value).toBe('Buch 1 (revidiert)');
      expect(book.titleKey).toBe('buch 1 (revidiert)');
    });
  });

  describe('archive and restore', () => {
    it('archive and restore are idempotent', () => {
      const book = LibraryBook.create({
        id: 'book-1',
        title: 'Buch 1',
      });
      const now1 = new Date('2026-03-01');
      const now2 = new Date('2026-04-01');

      // Restoring active book does nothing
      book.restore();
      expect(book.isArchived).toBe(false);

      // Archive
      book.archive(now1);
      expect(book.isArchived).toBe(true);
      expect(book.archivedAt).toBe(now1);

      // Archiving again keeps original archivedAt
      book.archive(now2);
      expect(book.archivedAt).toBe(now1);

      // Restore
      book.restore();
      expect(book.isArchived).toBe(false);
      expect(book.archivedAt).toBeNull();

      // Restore again
      book.restore();
      expect(book.isArchived).toBe(false);
    });

    it('modifications on archived book throw BookArchivedError', () => {
      const book = LibraryBook.create({
        id: 'book-1',
        title: 'Buch 1',
        archivedAt: new Date(),
      });

      expect(() => book.rename('Neuer Titel')).toThrow(BookArchivedError);
      expect(() =>
        book.place(new BookPlacement({ seriesId: 's', volume: 1 })),
      ).toThrow(BookArchivedError);
      expect(() => book.rename('Neuer Titel')).toThrow(
        expect.objectContaining({ itemType: 'book', id: 'book-1' }),
      );
    });
  });
});
