import { Inject, Injectable } from '@nestjs/common';
import { RehearsalValueInvalidError } from '../../domain/errors/rehearsal-log.errors';
import {
  REHEARSAL_REPOSITORY,
  type RehearsalRepository,
} from '../../domain/ports/rehearsal-repository.port';
import { RehearsalDate } from '../../domain/value-objects/rehearsal-date';
import { RehearsalViewBuilder } from '../services/rehearsal-view-builder';
import type { RehearsalSummaryView } from '../views/rehearsal.views';

export interface ListRehearsalsQuery {
  communityId: string;
  from?: string;
  to?: string;
}

@Injectable()
export class ListRehearsalsUseCase {
  constructor(
    @Inject(REHEARSAL_REPOSITORY)
    private readonly repository: RehearsalRepository,
    private readonly views: RehearsalViewBuilder,
  ) {}

  async execute(query: ListRehearsalsQuery): Promise<RehearsalSummaryView[]> {
    const from = query.from ? new RehearsalDate(query.from, 'from') : undefined;
    const to = query.to ? new RehearsalDate(query.to, 'to') : undefined;
    if (from && to && from.value > to.value) {
      throw new RehearsalValueInvalidError('range');
    }
    const items = await this.repository.list(query.communityId, { from, to });
    return this.views.summaries(query.communityId, items);
  }
}
