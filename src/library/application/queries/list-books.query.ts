import { Inject, Injectable } from '@nestjs/common';
import { LibrarySeries } from '../../domain/entities/library-series.entity';
import {
  BOOK_REPOSITORY,
  BookRepository,
} from '../../domain/ports/book-repository.port';
import {
  SERIES_REPOSITORY,
  SeriesRepository,
} from '../../domain/ports/series-repository.port';
import {
  SONG_REPOSITORY,
  SongRepository,
} from '../../domain/ports/song-repository.port';
import { BookSummaryView } from '../views/library.views';
import { toBookSummaryView } from '../views/view-mappers';

@Injectable()
export class ListBooksQuery {
  constructor(
    @Inject(BOOK_REPOSITORY)
    private readonly bookRepo: BookRepository,
    @Inject(SERIES_REPOSITORY)
    private readonly seriesRepo: SeriesRepository,
    @Inject(SONG_REPOSITORY)
    private readonly songRepo: SongRepository,
  ) {}

  async execute(options?: {
    seriesId?: string;
    q?: string;
    includeArchived?: boolean;
  }): Promise<BookSummaryView[]> {
    const books = await this.bookRepo.findAll({
      seriesId: options?.seriesId,
      search: options?.q,
      includeArchived: options?.includeArchived,
    });

    if (books.length === 0) {
      return [];
    }

    const seriesIds = Array.from(
      new Set(
        books.map((b) => b.seriesId).filter((id): id is string => id !== null),
      ),
    );

    const seriesMap = new Map<string, LibrarySeries>();
    await Promise.all(
      seriesIds.map(async (sId) => {
        const s = await this.seriesRepo.findById(sId);
        if (s) {
          seriesMap.set(sId, s);
        }
      }),
    );

    const bookIds = books.map((b) => b.id);
    const activeSongs = await this.songRepo.listByBookIds(bookIds, {
      includeArchived: false,
    });

    const songCountMap = new Map<string, number>();
    for (const song of activeSongs) {
      songCountMap.set(song.bookId, (songCountMap.get(song.bookId) ?? 0) + 1);
    }

    const views = books.map((book) => {
      const series =
        book.seriesId !== null ? (seriesMap.get(book.seriesId) ?? null) : null;
      const count = songCountMap.get(book.id) ?? 0;
      return toBookSummaryView(book, series, count);
    });

    return views.sort((a, b) => this.compareBooks(a, b));
  }

  private compareSeries(
    seriesA: string | undefined,
    seriesB: string | undefined,
    volA: number | null,
    volB: number | null,
  ): number | null {
    if (!seriesA && !seriesB) return null;
    if (!seriesA) return 1;
    if (!seriesB) return -1;
    const cmp = seriesA.localeCompare(seriesB, 'de');
    if (cmp !== 0) return cmp;
    return (
      (volA ?? Number.MAX_SAFE_INTEGER) - (volB ?? Number.MAX_SAFE_INTEGER)
    );
  }

  private compareBooks(a: BookSummaryView, b: BookSummaryView): number {
    const seriesCmp = this.compareSeries(
      a.series?.title,
      b.series?.title,
      a.volume,
      b.volume,
    );
    if (seriesCmp !== null && seriesCmp !== 0) {
      return seriesCmp;
    }
    return a.title.localeCompare(b.title, 'de');
  }
}
