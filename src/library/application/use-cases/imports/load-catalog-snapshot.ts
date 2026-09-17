import { BookRepository } from '../../../domain/ports/book-repository.port';
import { SeriesRepository } from '../../../domain/ports/series-repository.port';
import { SongRepository } from '../../../domain/ports/song-repository.port';
import { ThemeRepository } from '../../../domain/ports/theme-repository.port';
import { LibraryBook } from '../../../domain/entities/library-book.entity';
import { LibrarySeries } from '../../../domain/entities/library-series.entity';
import { CatalogSnapshot } from '../../../domain/services/import-planner';
import { ParsedLibraryFile } from '../../../domain/services/import-plan';
import { LibraryTitle } from '../../../domain/value-objects/library-title';

export interface SnapshotRepositories {
  seriesRepo: SeriesRepository;
  bookRepo: BookRepository;
  themeRepo: ThemeRepository;
  songRepo: SongRepository;
}

export async function loadCatalogSnapshot(
  file: ParsedLibraryFile,
  repos: SnapshotRepositories,
): Promise<CatalogSnapshot> {
  const allSeries = await repos.seriesRepo.findAll({ includeArchived: true });
  const allBooks = await repos.bookRepo.findAll({ includeArchived: true });
  const allThemes = await repos.themeRepo.findAll({ includeArchived: true });

  const affectedBookIds = findAffectedBookIds(file, allSeries, allBooks);
  const affectedSongs =
    affectedBookIds.length > 0
      ? await repos.songRepo.listByBookIds(affectedBookIds, {
          includeArchived: true,
        })
      : [];

  return {
    series: allSeries,
    books: allBooks,
    themes: allThemes,
    songs: affectedSongs,
  };
}

function findAffectedBookIds(
  file: ParsedLibraryFile,
  allSeries: LibrarySeries[],
  allBooks: LibraryBook[],
): string[] {
  const fileBookKeys = new Set(
    file.books.map((b) => new LibraryTitle(b.title).key),
  );
  const seriesNamesInFile = new Set(
    file.books
      .map((b) => b.series)
      .filter((s): s is string => s !== null && s.trim() !== '')
      .map((s) => new LibraryTitle(s).key),
  );

  const seriesIds = new Set<string>();
  for (const s of allSeries) {
    if (seriesNamesInFile.has(s.titleKey)) {
      seriesIds.add(s.id);
    }
  }

  const affectedBookIds = new Set<string>();
  for (const b of allBooks) {
    if (fileBookKeys.has(b.titleKey)) {
      affectedBookIds.add(b.id);
      if (b.seriesId) seriesIds.add(b.seriesId);
    }
  }

  for (const b of allBooks) {
    if (b.seriesId && seriesIds.has(b.seriesId)) {
      affectedBookIds.add(b.id);
    }
  }

  return Array.from(affectedBookIds);
}
