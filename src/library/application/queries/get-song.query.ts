import { Inject, Injectable } from '@nestjs/common';
import {
  BookNotFoundError,
  SongNotFoundError,
} from '../../domain/errors/library.errors';
import { BOOK_REPOSITORY } from '../../domain/ports/book-repository.port';
import type { BookRepository } from '../../domain/ports/book-repository.port';
import { SERIES_REPOSITORY } from '../../domain/ports/series-repository.port';
import type { SeriesRepository } from '../../domain/ports/series-repository.port';
import { SONG_REPOSITORY } from '../../domain/ports/song-repository.port';
import type { SongRepository } from '../../domain/ports/song-repository.port';
import { THEME_REPOSITORY } from '../../domain/ports/theme-repository.port';
import type { ThemeRepository } from '../../domain/ports/theme-repository.port';
import type { SongView } from '../views/library.views';
import { toSongView } from '../views/view-mappers';

@Injectable()
export class GetSongQuery {
  constructor(
    @Inject(SONG_REPOSITORY)
    private readonly songRepo: SongRepository,
    @Inject(BOOK_REPOSITORY)
    private readonly bookRepo: BookRepository,
    @Inject(SERIES_REPOSITORY)
    private readonly seriesRepo: SeriesRepository,
    @Inject(THEME_REPOSITORY)
    private readonly themeRepo: ThemeRepository,
  ) {}

  async execute(songId: string): Promise<SongView> {
    const song = await this.songRepo.findById(songId);
    if (!song) {
      throw new SongNotFoundError(songId);
    }

    const book = await this.bookRepo.findById(song.bookId);
    if (!book) {
      throw new BookNotFoundError(song.bookId);
    }

    const series = book.seriesId
      ? await this.seriesRepo.findById(book.seriesId)
      : null;
    const themes = await this.themeRepo.findByIds(song.themeIds);

    return toSongView(song, book, series, themes);
  }
}
