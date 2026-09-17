import { Inject, Injectable } from '@nestjs/common';
import { LibraryBook } from '../../../domain/entities/library-book.entity';
import { LibrarySeries } from '../../../domain/entities/library-series.entity';
import {
  BookTitleTakenError,
  SeriesArchivedError,
  SeriesNotFoundError,
  VolumeTakenError,
} from '../../../domain/errors/library.errors';
import { BOOK_REPOSITORY } from '../../../domain/ports/book-repository.port';
import type { BookRepository } from '../../../domain/ports/book-repository.port';
import { ID_GENERATOR } from '../../../domain/ports/id-generator.port';
import type { IdGenerator } from '../../../domain/ports/id-generator.port';
import { LIBRARY_UNIT_OF_WORK } from '../../../domain/ports/library-unit-of-work.port';
import type { LibraryUnitOfWork } from '../../../domain/ports/library-unit-of-work.port';
import { SERIES_REPOSITORY } from '../../../domain/ports/series-repository.port';
import type { SeriesRepository } from '../../../domain/ports/series-repository.port';
import { BookPlacement } from '../../../domain/value-objects/book-placement';
import { LibraryTitle } from '../../../domain/value-objects/library-title';
import { Volume } from '../../../domain/value-objects/volume';
import type { BookSummaryView } from '../../views/library.views';
import { toBookSummaryView } from '../../views/view-mappers';

export interface CreateBookCommand {
  title: string;
  seriesId?: string | null;
  volume?: number | null;
}

@Injectable()
export class CreateBookUseCase {
  constructor(
    @Inject(BOOK_REPOSITORY)
    private readonly bookRepo: BookRepository,
    @Inject(SERIES_REPOSITORY)
    private readonly seriesRepo: SeriesRepository,
    @Inject(LIBRARY_UNIT_OF_WORK)
    private readonly uow: LibraryUnitOfWork,
    @Inject(ID_GENERATOR)
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(command: CreateBookCommand): Promise<BookSummaryView> {
    return this.uow.run(async () => {
      const title = new LibraryTitle(command.title);
      const existing = await this.bookRepo.findByTitleKey(title.key);
      if (existing) {
        throw new BookTitleTakenError(existing.id, existing.isArchived);
      }

      const placement = new BookPlacement({
        seriesId: command.seriesId ?? null,
        volume:
          command.volume !== undefined && command.volume !== null
            ? new Volume(command.volume)
            : null,
      });

      let series: LibrarySeries | null = null;
      if (placement.seriesId !== null) {
        series = await this.seriesRepo.findById(placement.seriesId);
        if (!series) {
          throw new SeriesNotFoundError(placement.seriesId);
        }
        if (series.isArchived) {
          throw new SeriesArchivedError(placement.seriesId);
        }

        const existingVol = await this.bookRepo.findBySeriesAndVolume(
          placement.seriesId,
          placement.volume!.value,
        );
        if (existingVol) {
          throw new VolumeTakenError(existingVol.id);
        }
      }

      const id = this.idGenerator.generateId();
      const book = LibraryBook.create({ id, title, placement });
      await this.bookRepo.create(book);

      return toBookSummaryView(book, series, 0);
    });
  }
}
