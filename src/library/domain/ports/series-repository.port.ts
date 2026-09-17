import { LibrarySeries } from '../entities/library-series.entity';

export interface SeriesRepository {
  findById(id: string): Promise<LibrarySeries | null>;
  findByTitleKey(titleKey: string): Promise<LibrarySeries | null>;
  findAll(options?: { includeArchived?: boolean }): Promise<LibrarySeries[]>;
  save(series: LibrarySeries): Promise<void>;
  create(series: LibrarySeries): Promise<void>;
}

export const SERIES_REPOSITORY = Symbol('SERIES_REPOSITORY');
