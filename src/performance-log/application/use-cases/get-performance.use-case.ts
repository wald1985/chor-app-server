import { Inject, Injectable } from '@nestjs/common';
import { PerformanceNotFoundError } from '../../domain/errors/performance-log.errors';
import {
  PERFORMANCE_REPOSITORY,
  type PerformanceRepository,
} from '../../domain/ports/performance-repository.port';
import { PerformanceViewBuilder } from '../services/performance-view-builder';
import type { PerformanceView } from '../views/performance.views';

export interface PerformanceRef {
  communityId: string;
  performanceId: string;
}

@Injectable()
export class GetPerformanceUseCase {
  constructor(
    @Inject(PERFORMANCE_REPOSITORY)
    private readonly repository: PerformanceRepository,
    private readonly views: PerformanceViewBuilder,
  ) {}

  async execute(ref: PerformanceRef): Promise<PerformanceView> {
    const performance = await this.repository.findById(
      ref.communityId,
      ref.performanceId,
    );
    if (!performance) {
      throw new PerformanceNotFoundError(ref.performanceId);
    }
    const [view] = await this.views.build(ref.communityId, [performance]);
    return view;
  }
}
