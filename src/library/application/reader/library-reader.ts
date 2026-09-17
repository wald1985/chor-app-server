import { Inject, Injectable } from '@nestjs/common';
import { LibraryBook } from '../../domain/entities/library-book.entity';
import { LibrarySong } from '../../domain/entities/library-song.entity';
import { LibraryTheme } from '../../domain/entities/library-theme.entity';
import { BOOK_REPOSITORY } from '../../domain/ports/book-repository.port';
import type { BookRepository } from '../../domain/ports/book-repository.port';
import { SONG_REPOSITORY } from '../../domain/ports/song-repository.port';
import type { SongRepository } from '../../domain/ports/song-repository.port';
import { THEME_REPOSITORY } from '../../domain/ports/theme-repository.port';
import type { ThemeRepository } from '../../domain/ports/theme-repository.port';
import { LookupSongQuery } from '../queries/lookup-song.query';

export const LIBRARY_READER = Symbol('LIBRARY_READER');

export interface LibraryBookRef {
  id: string;
  title: string;
  seriesId: string | null;
  volume: number | null;
  archived: boolean;
}

export interface LibrarySongThemeRef {
  id: string;
  name: string;
  nameKey: string;
  archived: boolean;
}

export interface LibrarySongRef {
  id: string;
  bookId: string;
  seriesId: string | null;
  volume: number | null;
  number: string;
  title: string;
  author: string | null;
  arranger: string | null;
  themes: LibrarySongThemeRef[];
  archived: boolean;
}

export interface LibraryThemeRef {
  id: string;
  name: string;
  nameKey: string;
  archived: boolean;
}

export interface LibraryReader {
  findBooks(ids: string[]): Promise<LibraryBookRef[]>;
  findSongsByBookIds(
    bookIds: string[],
    options: { includeArchived: boolean },
  ): Promise<LibrarySongRef[]>;
  findSongs(ids: string[]): Promise<LibrarySongRef[]>;
  lookupSong(query: {
    bookId?: string;
    seriesId?: string;
    number: string;
  }): Promise<LibrarySongRef | null>;
  findThemes(ids: string[]): Promise<LibraryThemeRef[]>;
  listThemes(options: { includeArchived: boolean }): Promise<LibraryThemeRef[]>;
}

@Injectable()
export class DefaultLibraryReader implements LibraryReader {
  constructor(
    @Inject(BOOK_REPOSITORY)
    private readonly bookRepo: BookRepository,
    @Inject(SONG_REPOSITORY)
    private readonly songRepo: SongRepository,
    @Inject(THEME_REPOSITORY)
    private readonly themeRepo: ThemeRepository,
    private readonly lookupSongQuery: LookupSongQuery,
  ) {}

  async findBooks(ids: string[]): Promise<LibraryBookRef[]> {
    if (ids.length === 0) {
      return [];
    }
    const books = await this.bookRepo.findByIds(ids);
    return books.map((b) => this.toBookRef(b));
  }

  async findSongsByBookIds(
    bookIds: string[],
    options: { includeArchived: boolean },
  ): Promise<LibrarySongRef[]> {
    if (bookIds.length === 0) {
      return [];
    }
    const songs = await this.songRepo.listByBookIds(bookIds, options);
    return this.buildSongRefs(songs);
  }

  async findSongs(ids: string[]): Promise<LibrarySongRef[]> {
    if (ids.length === 0) {
      return [];
    }
    const songs = await this.songRepo.findByIds(ids);
    return this.buildSongRefs(songs);
  }

  async lookupSong(query: {
    bookId?: string;
    seriesId?: string;
    number: string;
  }): Promise<LibrarySongRef | null> {
    const songView = await this.lookupSongQuery.execute(query);
    if (!songView) {
      return null;
    }
    const song = await this.songRepo.findById(songView.id);
    if (!song) {
      return null;
    }
    const refs = await this.buildSongRefs([song]);
    return refs[0] ?? null;
  }

  async findThemes(ids: string[]): Promise<LibraryThemeRef[]> {
    if (ids.length === 0) {
      return [];
    }
    const themes = await this.themeRepo.findByIds(ids);
    return themes.map((t) => this.toThemeRef(t));
  }

  async listThemes(options: {
    includeArchived: boolean;
  }): Promise<LibraryThemeRef[]> {
    const themes = await this.themeRepo.findAll(options);
    return themes.map((t) => this.toThemeRef(t));
  }

  private async buildSongRefs(songs: LibrarySong[]): Promise<LibrarySongRef[]> {
    if (songs.length === 0) {
      return [];
    }
    const bookIds = Array.from(new Set(songs.map((s) => s.bookId)));
    const themeIds = Array.from(new Set(songs.flatMap((s) => s.themeIds)));

    const [books, themes] = await Promise.all([
      this.bookRepo.findByIds(bookIds),
      this.themeRepo.findByIds(themeIds),
    ]);

    const booksMap = new Map<string, LibraryBook>(books.map((b) => [b.id, b]));
    const themesMap = new Map<string, LibraryTheme>(
      themes.map((t) => [t.id, t]),
    );

    return songs.map((s) => {
      const book = booksMap.get(s.bookId);
      const songThemes: LibrarySongThemeRef[] = s.themeIds
        .map((tId) => themesMap.get(tId))
        .filter((t): t is LibraryTheme => t !== undefined)
        .map((t) => ({
          id: t.id,
          name: t.nameValue,
          nameKey: t.nameKey,
          archived: t.isArchived,
        }));

      return {
        id: s.id,
        bookId: s.bookId,
        seriesId: book?.seriesId ?? null,
        volume: book?.volumeValue ?? null,
        number: s.numberValue,
        title: s.titleValue,
        author: s.authorValue,
        arranger: s.arrangerValue,
        themes: songThemes,
        archived: s.isArchived,
      };
    });
  }

  private toBookRef(book: LibraryBook): LibraryBookRef {
    return {
      id: book.id,
      title: book.title.value,
      seriesId: book.seriesId,
      volume: book.volumeValue,
      archived: book.isArchived,
    };
  }

  private toThemeRef(theme: LibraryTheme): LibraryThemeRef {
    return {
      id: theme.id,
      name: theme.nameValue,
      nameKey: theme.nameKey,
      archived: theme.isArchived,
    };
  }
}
