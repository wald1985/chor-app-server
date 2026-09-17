import {
  SeriesArchivedError,
  SeriesHasActiveBooksError,
} from '../errors/library.errors';
import { LibraryTitle } from '../value-objects/library-title';
import { LibrarySeries } from './library-series.entity';

describe('LibrarySeries', () => {
  it('creates series with title and generates titleKey', () => {
    const series = LibrarySeries.create({
      id: 'series-1',
      title: 'Bücher',
    });

    expect(series.id).toBe('series-1');
    expect(series.title.value).toBe('Bücher');
    expect(series.titleKey).toBe('bücher');
    expect(series.isArchived).toBe(false);
    expect(series.archivedAt).toBeNull();
  });

  it('renames series when active', () => {
    const series = LibrarySeries.create({
      id: 'series-1',
      title: 'Alte Bücher',
    });

    series.rename('Neue Bücher');
    expect(series.title.value).toBe('Neue Bücher');
    expect(series.titleKey).toBe('neue bücher');

    series.rename(new LibraryTitle('Ganz Neue Bücher'));
    expect(series.title.value).toBe('Ganz Neue Bücher');
  });

  it('archive throws SeriesHasActiveBooksError if activeBookCount > 0', () => {
    const series = LibrarySeries.create({
      id: 'series-1',
      title: 'Bücher',
    });

    expect(() => series.archive(new Date(), 2, ['book-1', 'book-2'])).toThrow(
      SeriesHasActiveBooksError,
    );
    expect(series.isArchived).toBe(false);
  });

  it('archive succeeds when activeBookCount is 0', () => {
    const series = LibrarySeries.create({
      id: 'series-1',
      title: 'Bücher',
    });
    const now = new Date();

    series.archive(now, 0);

    expect(series.isArchived).toBe(true);
    expect(series.archivedAt).toBe(now);
  });

  it('archive and restore are idempotent', () => {
    const series = LibrarySeries.create({
      id: 'series-1',
      title: 'Bücher',
    });
    const now1 = new Date('2026-01-01');
    const now2 = new Date('2026-02-02');

    // Restore when already active does nothing
    series.restore();
    expect(series.isArchived).toBe(false);
    expect(series.archivedAt).toBeNull();

    // Archive
    series.archive(now1, 0);
    expect(series.archivedAt).toBe(now1);

    // Archiving again retains first archivedAt and does not throw even if active books are passed
    series.archive(now2, 5, ['b1']);
    expect(series.archivedAt).toBe(now1);

    // Restore
    series.restore();
    expect(series.isArchived).toBe(false);
    expect(series.archivedAt).toBeNull();

    // Restore again does nothing
    series.restore();
    expect(series.isArchived).toBe(false);
  });

  it('throws SeriesArchivedError on modification when archived', () => {
    const series = LibrarySeries.create({
      id: 'series-1',
      title: 'Bücher',
      archivedAt: new Date(),
    });

    expect(() => series.rename('Renamed')).toThrow(SeriesArchivedError);
    expect(() => series.rename('Renamed')).toThrow(
      expect.objectContaining({ itemType: 'series', id: 'series-1' }),
    );
  });
});
