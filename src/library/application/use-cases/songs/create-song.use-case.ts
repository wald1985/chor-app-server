import { Inject, Injectable } from '@nestjs/common';
import { LibrarySong } from '../../../domain/entities/library-song.entity';
import {
  BookArchivedError,
  BookNotFoundError,
  SongNumberTakenError,
  ThemeArchivedError,
  ThemeNotFoundError,
} from '../../../domain/errors/library.errors';
import { BOOK_REPOSITORY } from '../../../domain/ports/book-repository.port';
import type { BookRepository } from '../../../domain/ports/book-repository.port';
import { ID_GENERATOR } from '../../../domain/ports/id-generator.port';
import type { IdGenerator } from '../../../domain/ports/id-generator.port';
import { LIBRARY_UNIT_OF_WORK } from '../../../domain/ports/library-unit-of-work.port';
import type { LibraryUnitOfWork } from '../../../domain/ports/library-unit-of-work.port';
import { SONG_REPOSITORY } from '../../../domain/ports/song-repository.port';
import type { SongRepository } from '../../../domain/ports/song-repository.port';
import { THEME_REPOSITORY } from '../../../domain/ports/theme-repository.port';
import type { ThemeRepository } from '../../../domain/ports/theme-repository.port';
import { SongNumber } from '../../../domain/value-objects/song-number';

export interface CreateSongCommand {
  bookId: string;
  number: string | number;
  title: string;
  author?: string | null;
  arranger?: string | null;
  themeIds?: string[];
}

@Injectable()
export class CreateSongUseCase {
  constructor(
    @Inject(SONG_REPOSITORY)
    private readonly songRepo: SongRepository,
    @Inject(BOOK_REPOSITORY)
    private readonly bookRepo: BookRepository,
    @Inject(THEME_REPOSITORY)
    private readonly themeRepo: ThemeRepository,
    @Inject(LIBRARY_UNIT_OF_WORK)
    private readonly uow: LibraryUnitOfWork,
    @Inject(ID_GENERATOR)
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(command: CreateSongCommand): Promise<LibrarySong> {
    return this.uow.run(async () => {
      const book = await this.bookRepo.findById(command.bookId);
      if (!book) {
        throw new BookNotFoundError(command.bookId);
      }
      if (book.isArchived) {
        throw new BookArchivedError(command.bookId);
      }

      const songNumber = new SongNumber(command.number);
      const existing = await this.songRepo.findByScope(
        book.numberScopeId(),
        songNumber.key,
      );
      if (existing) {
        throw new SongNumberTakenError(
          existing.id,
          existing.bookId,
          existing.isArchived,
        );
      }

      const themeIds = Array.from(new Set(command.themeIds ?? []));
      await this.validateThemes(themeIds);

      const id = this.idGenerator.generateId();
      const song = LibrarySong.create(book, {
        id,
        number: songNumber,
        title: command.title,
        author: command.author,
        arranger: command.arranger,
        themeIds,
      });

      await this.songRepo.create(song);
      return song;
    });
  }

  private async validateThemes(themeIds: string[]): Promise<void> {
    if (themeIds.length === 0) {
      return;
    }
    const themes = await this.themeRepo.findByIds(themeIds);
    if (themes.length !== themeIds.length) {
      const foundIds = new Set(themes.map((t) => t.id));
      const missingId = themeIds.find((id) => !foundIds.has(id));
      throw new ThemeNotFoundError(missingId!);
    }
    for (const theme of themes) {
      if (theme.isArchived) {
        throw new ThemeArchivedError(theme.id);
      }
    }
  }
}
