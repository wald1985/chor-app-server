import { Inject, Injectable } from '@nestjs/common';
import {
  SeriesArchivedError,
  SeriesNotFoundError,
  SeriesTitleTakenError,
} from '../../../domain/errors/library.errors';
import {
  LIBRARY_UNIT_OF_WORK,
  LibraryUnitOfWork,
} from '../../../domain/ports/library-unit-of-work.port';
import {
  SERIES_REPOSITORY,
  SeriesRepository,
} from '../../../domain/ports/series-repository.port';
import { LibraryTitle } from '../../../domain/value-objects/library-title';

export interface RenameSeriesCommand {
  id: string;
  title: string;
}

@Injectable()
export class RenameSeriesUseCase {
  constructor(
    @Inject(SERIES_REPOSITORY)
    private readonly seriesRepo: SeriesRepository,
    @Inject(LIBRARY_UNIT_OF_WORK)
    private readonly uow: LibraryUnitOfWork,
  ) {}

  async execute(command: RenameSeriesCommand): Promise<void> {
    await this.uow.run(async () => {
      const series = await this.seriesRepo.findById(command.id);
      if (!series) {
        throw new SeriesNotFoundError(command.id);
      }
      if (series.isArchived) {
        throw new SeriesArchivedError(command.id);
      }

      const newTitle = new LibraryTitle(command.title);
      if (series.title.value === newTitle.value) {
        return;
      }

      if (series.titleKey !== newTitle.key) {
        const existing = await this.seriesRepo.findByTitleKey(newTitle.key);
        if (existing && existing.id !== series.id) {
          throw new SeriesTitleTakenError(existing.id, existing.isArchived);
        }
      }

      series.rename(newTitle);
      await this.seriesRepo.save(series);
    });
  }
}
