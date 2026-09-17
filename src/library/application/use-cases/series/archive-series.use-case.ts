import { Inject, Injectable } from '@nestjs/common';
import {
  SeriesHasActiveBooksError,
  SeriesNotFoundError,
} from '../../../domain/errors/library.errors';
import { BOOK_REPOSITORY } from '../../../domain/ports/book-repository.port';
import type { BookRepository } from '../../../domain/ports/book-repository.port';
import { CLOCK } from '../../../domain/ports/clock.port';
import type { Clock } from '../../../domain/ports/clock.port';
import { LIBRARY_UNIT_OF_WORK } from '../../../domain/ports/library-unit-of-work.port';
import type { LibraryUnitOfWork } from '../../../domain/ports/library-unit-of-work.port';
import { SERIES_REPOSITORY } from '../../../domain/ports/series-repository.port';
import type { SeriesRepository } from '../../../domain/ports/series-repository.port';

export interface ArchiveSeriesCommand {
  id: string;
}

@Injectable()
export class ArchiveSeriesUseCase {
  constructor(
    @Inject(SERIES_REPOSITORY)
    private readonly seriesRepo: SeriesRepository,
    @Inject(BOOK_REPOSITORY)
    private readonly bookRepo: BookRepository,
    @Inject(LIBRARY_UNIT_OF_WORK)
    private readonly uow: LibraryUnitOfWork,
    @Inject(CLOCK)
    private readonly clock: Clock,
  ) {}

  async execute(command: ArchiveSeriesCommand): Promise<void> {
    await this.uow.run(async () => {
      const series = await this.seriesRepo.findById(command.id);
      if (!series) {
        throw new SeriesNotFoundError(command.id);
      }
      if (series.isArchived) {
        return;
      }

      const activeBookIds = await this.bookRepo.findActiveIdsBySeriesId(
        series.id,
      );
      if (activeBookIds.length > 0) {
        throw new SeriesHasActiveBooksError(activeBookIds);
      }

      series.archive(this.clock.now(), 0, []);
      await this.seriesRepo.save(series);
    });
  }
}
