import { Inject, Injectable } from '@nestjs/common';
import {
  BookNotFoundError,
  SeriesArchivedError,
} from '../../../domain/errors/library.errors';
import {
  BOOK_REPOSITORY,
  BookRepository,
} from '../../../domain/ports/book-repository.port';
import {
  LIBRARY_UNIT_OF_WORK,
  LibraryUnitOfWork,
} from '../../../domain/ports/library-unit-of-work.port';
import {
  SERIES_REPOSITORY,
  SeriesRepository,
} from '../../../domain/ports/series-repository.port';

export interface RestoreBookCommand {
  id: string;
}

@Injectable()
export class RestoreBookUseCase {
  constructor(
    @Inject(BOOK_REPOSITORY)
    private readonly bookRepo: BookRepository,
    @Inject(SERIES_REPOSITORY)
    private readonly seriesRepo: SeriesRepository,
    @Inject(LIBRARY_UNIT_OF_WORK)
    private readonly uow: LibraryUnitOfWork,
  ) {}

  async execute(command: RestoreBookCommand): Promise<void> {
    await this.uow.run(async () => {
      const book = await this.bookRepo.findById(command.id);
      if (!book) {
        throw new BookNotFoundError(command.id);
      }
      if (!book.isArchived) {
        return;
      }

      if (book.seriesId) {
        const series = await this.seriesRepo.findById(book.seriesId);
        if (series && series.isArchived) {
          throw new SeriesArchivedError(book.seriesId);
        }
      }

      book.restore();
      await this.bookRepo.save(book);
    });
  }
}
