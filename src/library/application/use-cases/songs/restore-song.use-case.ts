import { Inject, Injectable } from '@nestjs/common';
import {
  BookArchivedError,
  SongNotFoundError,
} from '../../../domain/errors/library.errors';
import { BOOK_REPOSITORY } from '../../../domain/ports/book-repository.port';
import type { BookRepository } from '../../../domain/ports/book-repository.port';
import { LIBRARY_UNIT_OF_WORK } from '../../../domain/ports/library-unit-of-work.port';
import type { LibraryUnitOfWork } from '../../../domain/ports/library-unit-of-work.port';
import { SONG_REPOSITORY } from '../../../domain/ports/song-repository.port';
import type { SongRepository } from '../../../domain/ports/song-repository.port';

export interface RestoreSongCommand {
  id: string;
}

@Injectable()
export class RestoreSongUseCase {
  constructor(
    @Inject(SONG_REPOSITORY)
    private readonly songRepo: SongRepository,
    @Inject(BOOK_REPOSITORY)
    private readonly bookRepo: BookRepository,
    @Inject(LIBRARY_UNIT_OF_WORK)
    private readonly uow: LibraryUnitOfWork,
  ) {}

  async execute(command: RestoreSongCommand): Promise<void> {
    await this.uow.run(async () => {
      const song = await this.songRepo.findById(command.id);
      if (!song) {
        throw new SongNotFoundError(command.id);
      }
      if (!song.isArchived) {
        return;
      }

      const book = await this.bookRepo.findById(song.bookId);
      if (book && book.isArchived) {
        throw new BookArchivedError(book.id);
      }

      song.restore();
      await this.songRepo.save(song);
    });
  }
}
