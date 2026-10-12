import { Inject, Injectable } from '@nestjs/common';
import { RehearsalEntry } from '../../domain/entities/rehearsal-entry.entity';
import { RehearsalNotFoundError } from '../../domain/errors/rehearsal-log.errors';
import {
  REHEARSAL_REPOSITORY,
  type RehearsalRepository,
} from '../../domain/ports/rehearsal-repository.port';
import { ReferenceValidator } from '../services/reference-validator';
import { RehearsalViewBuilder } from '../services/rehearsal-view-builder';
import type { RehearsalEntryView } from '../views/rehearsal.views';

export interface AddRehearsalEntryCommand {
  communityId: string;
  rehearsalId: string;
  songId: string;
  pianistId?: string | null;
  conductorId?: string | null;
  note?: string | null;
}

@Injectable()
export class AddRehearsalEntryUseCase {
  constructor(
    @Inject(REHEARSAL_REPOSITORY)
    private readonly repository: RehearsalRepository,
    private readonly references: ReferenceValidator,
    private readonly views: RehearsalViewBuilder,
  ) {}

  async execute(
    command: AddRehearsalEntryCommand,
  ): Promise<RehearsalEntryView> {
    const rehearsal = await this.repository.findById(
      command.communityId,
      command.rehearsalId,
    );
    if (!rehearsal) {
      throw new RehearsalNotFoundError(command.rehearsalId);
    }
    const entry = RehearsalEntry.create({
      rehearsalId: rehearsal.id,
      songId: command.songId,
      pianistId: command.pianistId,
      conductorId: command.conductorId,
      note: command.note,
    });

    await this.references.assertSongUsable(command.communityId, command.songId);
    await this.references.assertPeopleUsable(command.communityId, [
      { id: command.pianistId, role: 'PIANIST' },
      { id: command.conductorId, role: 'CONDUCTOR' },
    ]);

    await this.repository.addEntry(entry);
    return this.views.entry(command.communityId, entry);
  }
}
