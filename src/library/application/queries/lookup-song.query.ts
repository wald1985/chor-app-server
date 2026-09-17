import { Inject, Injectable } from '@nestjs/common';
import { LibrarySong } from '../../domain/entities/library-song.entity';
import {
  BookNotFoundError,
  LookupScopeInvalidError,
} from '../../domain/errors/library.errors';
import { BOOK_REPOSITORY } from '../../domain/ports/book-repository.port';
import type { BookRepository } from '../../domain/ports/book-repository.port';
import { SERIES_REPOSITORY } from '../../domain/ports/series-repository.port';
import type { SeriesRepository } from '../../domain/ports/series-repository.port';
import { SONG_REPOSITORY } from '../../domain/ports/song-repository.port';
import type { SongRepository } from '../../domain/ports/song-repository.port';
import { THEME_REPOSITORY } from '../../domain/ports/theme-repository.port';
import type { ThemeRepository } from '../../domain/ports/theme-repository.port';
import { SongNumber } from '../../domain/value-objects/song-number';
import type { SongView } from '../views/library.views';
import { toSongView } from '../views/view-mappers';

export interface LookupSongParams {
  number: string;
  bookId?: string;
  seriesId?: string;
}

@Injectable()
export class LookupSongQuery {
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

  async execute(params: LookupSongParams): Promise<SongView | null> {
    this.validateScope(params);
    const songNumber = new SongNumber(params.number);
    const song = await this.findSong(params, songNumber);

    if (!song) {
      return null;
    }

    const book = await this.bookRepo.findById(song.bookId);
    if (!book) {
      return null;
    }

    const series = book.seriesId
      ? await this.seriesRepo.findById(book.seriesId)
      : null;
    const themes = await this.themeRepo.findByIds(song.themeIds);

    return toSongView(song, book, series, themes);
  }

  private validateScope(params: LookupSongParams): void {
    const hasBook =
      params.bookId !== undefined && params.bookId.trim().length > 0;
    const hasSeries =
      params.seriesId !== undefined && params.seriesId.trim().length > 0;

    if ((hasBook && hasSeries) || (!hasBook && !hasSeries)) {
      throw new LookupScopeInvalidError();
    }
  }

  private async findSong(
    params: LookupSongParams,
    songNumber: SongNumber,
  ): Promise<LibrarySong | null> {
    if (params.seriesId) {
      return await this.songRepo.findByScope(
        params.seriesId.trim(),
        songNumber.key,
      );
    }
    const bookId = (params.bookId as string).trim();
    const book = await this.bookRepo.findById(bookId);
    if (!book) {
      throw new BookNotFoundError(bookId);
    }
    const candidate = await this.songRepo.findByScope(
      book.numberScopeId(),
      songNumber.key,
    );
    if (candidate && candidate.bookId === bookId) {
      return candidate;
    }
    return null;
  }
}
