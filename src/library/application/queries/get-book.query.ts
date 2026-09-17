import { Inject, Injectable } from '@nestjs/common';
import { LibraryTheme } from '../../domain/entities/library-theme.entity';
import { BookNotFoundError } from '../../domain/errors/library.errors';
import { BOOK_REPOSITORY } from '../../domain/ports/book-repository.port';
import type { BookRepository } from '../../domain/ports/book-repository.port';
import { SERIES_REPOSITORY } from '../../domain/ports/series-repository.port';
import type { SeriesRepository } from '../../domain/ports/series-repository.port';
import { SONG_REPOSITORY } from '../../domain/ports/song-repository.port';
import type { SongRepository } from '../../domain/ports/song-repository.port';
import { THEME_REPOSITORY } from '../../domain/ports/theme-repository.port';
import type { ThemeRepository } from '../../domain/ports/theme-repository.port';
import type { BookView } from '../views/library.views';
import { toBookView } from '../views/view-mappers';

@Injectable()
export class GetBookQuery {
  constructor(
    @Inject(BOOK_REPOSITORY)
    private readonly bookRepo: BookRepository,
    @Inject(SERIES_REPOSITORY)
    private readonly seriesRepo: SeriesRepository,
    @Inject(SONG_REPOSITORY)
    private readonly songRepo: SongRepository,
    @Inject(THEME_REPOSITORY)
    private readonly themeRepo: ThemeRepository,
  ) {}

  async execute(
    bookId: string,
    options?: { includeArchivedSongs?: boolean },
  ): Promise<BookView> {
    const book = await this.bookRepo.findById(bookId);
    if (!book) {
      throw new BookNotFoundError(bookId);
    }

    const series = book.seriesId
      ? await this.seriesRepo.findById(book.seriesId)
      : null;

    const songs = await this.songRepo.listByBookIds([book.id], {
      includeArchived: options?.includeArchivedSongs,
    });

    const themeIds = Array.from(new Set(songs.flatMap((s) => s.themeIds)));
    const themes = await this.themeRepo.findByIds(themeIds);
    const themesMap = new Map<string, LibraryTheme>(
      themes.map((t) => [t.id, t]),
    );

    return toBookView(book, series, songs, themesMap);
  }
}
