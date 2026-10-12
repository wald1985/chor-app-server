import { Inject, Injectable } from '@nestjs/common';
import {
  RehearsalNotEmptyError,
  RehearsalNotFoundError,
} from '../../domain/errors/rehearsal-log.errors';
import {
  REHEARSAL_REPOSITORY,
  type RehearsalRepository,
} from '../../domain/ports/rehearsal-repository.port';
import type { RehearsalRef } from './get-rehearsal.use-case';

/** Only an empty rehearsal can go; logged songs are never destroyed implicitly. */
@Injectable()
export class DeleteRehearsalUseCase {
  constructor(
    @Inject(REHEARSAL_REPOSITORY)
    private readonly repository: RehearsalRepository,
  ) {}

  async execute(ref: RehearsalRef): Promise<void> {
    const outcome = await this.repository.deleteIfEmpty(
      ref.communityId,
      ref.rehearsalId,
    );
    if (outcome === 'not_found') {
      throw new RehearsalNotFoundError(ref.rehearsalId);
    }
    if (outcome === 'not_empty') {
      throw new RehearsalNotEmptyError(ref.rehearsalId);
    }
  }
}
