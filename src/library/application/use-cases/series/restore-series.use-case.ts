import { Inject, Injectable } from '@nestjs/common';
import { SeriesNotFoundError } from '../../../domain/errors/library.errors';
import { LIBRARY_UNIT_OF_WORK } from '../../../domain/ports/library-unit-of-work.port';
import type { LibraryUnitOfWork } from '../../../domain/ports/library-unit-of-work.port';
import { SERIES_REPOSITORY } from '../../../domain/ports/series-repository.port';
import type { SeriesRepository } from '../../../domain/ports/series-repository.port';

export interface RestoreSeriesCommand {
  id: string;
}

@Injectable()
export class RestoreSeriesUseCase {
  constructor(
    @Inject(SERIES_REPOSITORY)
    private readonly seriesRepo: SeriesRepository,
    @Inject(LIBRARY_UNIT_OF_WORK)
    private readonly uow: LibraryUnitOfWork,
  ) {}

  async execute(command: RestoreSeriesCommand): Promise<void> {
    await this.uow.run(async () => {
      const series = await this.seriesRepo.findById(command.id);
      if (!series) {
        throw new SeriesNotFoundError(command.id);
      }
      if (!series.isArchived) {
        return;
      }

      series.restore();
      await this.seriesRepo.save(series);
    });
  }
}
