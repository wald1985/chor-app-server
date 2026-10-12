import { Inject, Injectable } from '@nestjs/common';
import { PerformanceNotFoundError } from '../../domain/errors/performance-log.errors';
import {
  PERFORMANCE_REPOSITORY,
  type PerformanceRepository,
} from '../../domain/ports/performance-repository.port';
import type { PerformanceRef } from './get-performance.use-case';

/** Hard delete of a wrongly entered Performance (the one place we do not archive). */
@Injectable()
export class DeletePerformanceUseCase {
  constructor(
    @Inject(PERFORMANCE_REPOSITORY)
    private readonly repository: PerformanceRepository,
  ) {}

  async execute(ref: PerformanceRef): Promise<void> {
    const deleted = await this.repository.delete(
      ref.communityId,
      ref.performanceId,
    );
    if (!deleted) {
      throw new PerformanceNotFoundError(ref.performanceId);
    }
  }
}
