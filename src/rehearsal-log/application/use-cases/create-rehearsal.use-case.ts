import { Inject, Injectable } from '@nestjs/common';
import { Rehearsal } from '../../domain/entities/rehearsal.entity';
import { RehearsalDateTakenError } from '../../domain/errors/rehearsal-log.errors';
import {
  REHEARSAL_REPOSITORY,
  type RehearsalRepository,
} from '../../domain/ports/rehearsal-repository.port';
import { RehearsalDate } from '../../domain/value-objects/rehearsal-date';
import { ReferenceValidator } from '../services/reference-validator';
import { RehearsalViewBuilder } from '../services/rehearsal-view-builder';
import type { RehearsalDetailView } from '../views/rehearsal.views';

export interface CreateRehearsalCommand {
  communityId: string;
  date: string;
  warmUpLeaderId?: string | null;
  note?: string | null;
}

@Injectable()
export class CreateRehearsalUseCase {
  constructor(
    @Inject(REHEARSAL_REPOSITORY)
    private readonly repository: RehearsalRepository,
    private readonly references: ReferenceValidator,
    private readonly views: RehearsalViewBuilder,
  ) {}

  async execute(command: CreateRehearsalCommand): Promise<RehearsalDetailView> {
    const date = new RehearsalDate(command.date);
    const rehearsal = Rehearsal.create({
      communityId: command.communityId,
      date,
      warmUpLeaderId: command.warmUpLeaderId,
      note: command.note,
    });

    const existing = await this.repository.findByDate(
      command.communityId,
      date,
    );
    if (existing) {
      throw new RehearsalDateTakenError(date.iso, existing.id);
    }
    await this.references.assertPeopleUsable(command.communityId, [
      { id: command.warmUpLeaderId, role: 'CONDUCTOR' },
    ]);

    await this.repository.save(rehearsal);
    return this.views.detail(command.communityId, rehearsal, []);
  }
}
