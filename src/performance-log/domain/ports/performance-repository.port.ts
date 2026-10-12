import { Performance } from '../entities/performance.entity';
import { PerformanceDate } from '../value-objects/performance-date';

export const PERFORMANCE_REPOSITORY = Symbol('PERFORMANCE_REPOSITORY');

export interface ListPerformancesOptions {
  from?: PerformanceDate;
  to?: PerformanceDate;
  limit: number;
}

export interface PerformanceRepository {
  findById(communityId: string, id: string): Promise<Performance | null>;
  list(
    communityId: string,
    options: ListPerformancesOptions,
  ): Promise<Performance[]>;
  save(performance: Performance): Promise<void>;
  delete(communityId: string, id: string): Promise<boolean>;
}
