import { Inject, Injectable } from '@nestjs/common';
import { RehearsalNotFoundError } from '../../domain/errors/rehearsal-log.errors';
import {
  REHEARSAL_REPOSITORY,
  type RehearsalRepository,
} from '../../domain/ports/rehearsal-repository.port';
import { ReferenceValidator } from '../services/reference-validator';
import { RehearsalViewBuilder } from '../services/rehearsal-view-builder';
import type { RehearsalDetailView } from '../views/rehearsal.views';

export interface UpdateRehearsalCommand {
  communityId: string;
  rehearsalId: string;
  /** `undefined` leaves the value alone, `null` clears it. */
  warmUpLeaderId?: string | null;
  note?: string | null;
}

@Injectable()
export class UpdateRehearsalUseCase {
  constructor(
    @Inject(REHEARSAL_REPOSITORY)
    private readonly repository: RehearsalRepository,
    private readonly references: ReferenceValidator,
    private readonly views: RehearsalViewBuilder,
  ) {}

  async execute(command: UpdateRehearsalCommand): Promise<RehearsalDetailView> {
    const rehearsal = await this.repository.findById(
      command.communityId,
      command.rehearsalId,
    );
    if (!rehearsal) {
      throw new RehearsalNotFoundError(command.rehearsalId);
    }

    // Validate before mutating so a rejected request changes nothing.
    if (command.note !== undefined) {
      rehearsal.changeNote(command.note);
    }
    if (command.warmUpLeaderId !== undefined) {
      await this.references.assertPeopleUsable(command.communityId, [
        { id: command.warmUpLeaderId, role: 'CONDUCTOR' },
      ]);
      rehearsal.changeWarmUpLeader(command.warmUpLeaderId);
    }

    await this.repository.save(rehearsal);
    const entries = await this.repository.listEntries(rehearsal.id);
    return this.views.detail(command.communityId, rehearsal, entries);
  }
}
