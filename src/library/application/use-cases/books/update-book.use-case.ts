import { Inject, Injectable } from '@nestjs/common';
import {
  BookArchivedError,
  BookNotFoundError,
  BookTitleTakenError,
} from '../../../domain/errors/library.errors';
import { BOOK_REPOSITORY } from '../../../domain/ports/book-repository.port';
import type { BookRepository } from '../../../domain/ports/book-repository.port';
import { LIBRARY_UNIT_OF_WORK } from '../../../domain/ports/library-unit-of-work.port';
import type { LibraryUnitOfWork } from '../../../domain/ports/library-unit-of-work.port';
import { LibraryTitle } from '../../../domain/value-objects/library-title';

export interface UpdateBookCommand {
  id: string;
  title: string;
}

@Injectable()
export class UpdateBookUseCase {
  constructor(
    @Inject(BOOK_REPOSITORY)
    private readonly bookRepo: BookRepository,
    @Inject(LIBRARY_UNIT_OF_WORK)
    private readonly uow: LibraryUnitOfWork,
  ) {}

  async execute(command: UpdateBookCommand): Promise<void> {
    await this.uow.run(async () => {
      const book = await this.bookRepo.findById(command.id);
      if (!book) {
        throw new BookNotFoundError(command.id);
      }
      if (book.isArchived) {
        throw new BookArchivedError(command.id);
      }

      const newTitle = new LibraryTitle(command.title);
      if (book.title.value === newTitle.value) {
        return;
      }

      if (book.titleKey !== newTitle.key) {
        const existing = await this.bookRepo.findByTitleKey(newTitle.key);
        if (existing && existing.id !== book.id) {
          throw new BookTitleTakenError(existing.id, existing.isArchived);
        }
      }

      book.rename(newTitle);
      await this.bookRepo.save(book);
    });
  }
}
