import { Inject, Injectable } from '@nestjs/common';
import { BookNotFoundError } from '../../../domain/errors/library.errors';
import {
  BOOK_REPOSITORY,
  BookRepository,
} from '../../../domain/ports/book-repository.port';
import { CLOCK, Clock } from '../../../domain/ports/clock.port';
import {
  LIBRARY_UNIT_OF_WORK,
  LibraryUnitOfWork,
} from '../../../domain/ports/library-unit-of-work.port';

export interface ArchiveBookCommand {
  id: string;
}

@Injectable()
export class ArchiveBookUseCase {
  constructor(
    @Inject(BOOK_REPOSITORY)
    private readonly bookRepo: BookRepository,
    @Inject(LIBRARY_UNIT_OF_WORK)
    private readonly uow: LibraryUnitOfWork,
    @Inject(CLOCK)
    private readonly clock: Clock,
  ) {}

  async execute(command: ArchiveBookCommand): Promise<void> {
    await this.uow.run(async () => {
      const book = await this.bookRepo.findById(command.id);
      if (!book) {
        throw new BookNotFoundError(command.id);
      }
      if (book.isArchived) {
        return;
      }

      book.archive(this.clock.now());
      await this.bookRepo.save(book);
    });
  }
}
