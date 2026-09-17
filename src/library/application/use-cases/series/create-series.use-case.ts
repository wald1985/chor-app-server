import { Inject, Injectable } from '@nestjs/common';
import { LibrarySeries } from '../../../domain/entities/library-series.entity';
import { SeriesTitleTakenError } from '../../../domain/errors/library.errors';
import { ID_GENERATOR } from '../../../domain/ports/id-generator.port';
import type { IdGenerator } from '../../../domain/ports/id-generator.port';
import { LIBRARY_UNIT_OF_WORK } from '../../../domain/ports/library-unit-of-work.port';
import type { LibraryUnitOfWork } from '../../../domain/ports/library-unit-of-work.port';
import { SERIES_REPOSITORY } from '../../../domain/ports/series-repository.port';
import type { SeriesRepository } from '../../../domain/ports/series-repository.port';
import { LibraryTitle } from '../../../domain/value-objects/library-title';
import type { SeriesView } from '../../views/library.views';
import { toSeriesView } from '../../views/view-mappers';

export interface CreateSeriesCommand {
  title: string;
}

@Injectable()
export class CreateSeriesUseCase {
  constructor(
    @Inject(SERIES_REPOSITORY)
    private readonly seriesRepo: SeriesRepository,
    @Inject(LIBRARY_UNIT_OF_WORK)
    private readonly uow: LibraryUnitOfWork,
    @Inject(ID_GENERATOR)
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(command: CreateSeriesCommand): Promise<SeriesView> {
    return this.uow.run(async () => {
      const title = new LibraryTitle(command.title);
      const existing = await this.seriesRepo.findByTitleKey(title.key);
      if (existing) {
        throw new SeriesTitleTakenError(existing.id, existing.isArchived);
      }

      const id = this.idGenerator.generateId();
      const series = LibrarySeries.create({ id, title });
      await this.seriesRepo.create(series);
      return toSeriesView(series, []);
    });
  }
}
