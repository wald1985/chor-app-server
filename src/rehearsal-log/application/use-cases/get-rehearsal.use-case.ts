import { Inject, Injectable } from '@nestjs/common';
import { RehearsalNotFoundError } from '../../domain/errors/rehearsal-log.errors';
import {
  REHEARSAL_REPOSITORY,
  type RehearsalRepository,
} from '../../domain/ports/rehearsal-repository.port';
import { RehearsalViewBuilder } from '../services/rehearsal-view-builder';
import type { RehearsalDetailView } from '../views/rehearsal.views';

export interface RehearsalRef {
  communityId: string;
  rehearsalId: string;
}

@Injectable()
export class GetRehearsalUseCase {
  constructor(
    @Inject(REHEARSAL_REPOSITORY)
    private readonly repository: RehearsalRepository,
    private readonly views: RehearsalViewBuilder,
  ) {}

  async execute(ref: RehearsalRef): Promise<RehearsalDetailView> {
    const rehearsal = await this.repository.findById(
      ref.communityId,
      ref.rehearsalId,
    );
    if (!rehearsal) {
      throw new RehearsalNotFoundError(ref.rehearsalId);
    }
    const entries = await this.repository.listEntries(rehearsal.id);
    return this.views.detail(ref.communityId, rehearsal, entries);
  }
}
