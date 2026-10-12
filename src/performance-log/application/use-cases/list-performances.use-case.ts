import { Inject, Injectable } from '@nestjs/common';
import { PerformanceValueInvalidError } from '../../domain/errors/performance-log.errors';
import {
  PERFORMANCE_REPOSITORY,
  type PerformanceRepository,
} from '../../domain/ports/performance-repository.port';
import { PerformanceDate } from '../../domain/value-objects/performance-date';
import { PerformanceViewBuilder } from '../services/performance-view-builder';
import type { PerformanceView } from '../views/performance.views';

export const DEFAULT_PERFORMANCE_LIMIT = 50;
export const MAX_PERFORMANCE_LIMIT = 200;

export interface ListPerformancesQuery {
  communityId: string;
  from?: string;
  to?: string;
  limit?: number;
}

@Injectable()
export class ListPerformancesUseCase {
  constructor(
    @Inject(PERFORMANCE_REPOSITORY)
    private readonly repository: PerformanceRepository,
    private readonly views: PerformanceViewBuilder,
  ) {}

  async execute(query: ListPerformancesQuery): Promise<PerformanceView[]> {
    const from = query.from
      ? new PerformanceDate(query.from, 'from')
      : undefined;
    const to = query.to ? new PerformanceDate(query.to, 'to') : undefined;
    if (from && to && from.value > to.value) {
      throw new PerformanceValueInvalidError('range');
    }
    const limit = Math.min(
      Math.max(query.limit ?? DEFAULT_PERFORMANCE_LIMIT, 1),
      MAX_PERFORMANCE_LIMIT,
    );

    const performances = await this.repository.list(query.communityId, {
      from,
      to,
      limit,
    });
    return this.views.build(query.communityId, performances);
  }
}
