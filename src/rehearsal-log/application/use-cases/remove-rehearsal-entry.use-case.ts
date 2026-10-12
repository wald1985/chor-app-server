import { Inject, Injectable } from '@nestjs/common';
import {
  RehearsalEntryNotFoundError,
  RehearsalNotFoundError,
} from '../../domain/errors/rehearsal-log.errors';
import {
  REHEARSAL_REPOSITORY,
  type RehearsalRepository,
} from '../../domain/ports/rehearsal-repository.port';

export interface RemoveRehearsalEntryCommand {
  communityId: string;
  rehearsalId: string;
  entryId: string;
}

@Injectable()
export class RemoveRehearsalEntryUseCase {
  constructor(
    @Inject(REHEARSAL_REPOSITORY)
    private readonly repository: RehearsalRepository,
  ) {}

  async execute(command: RemoveRehearsalEntryCommand): Promise<void> {
    const rehearsal = await this.repository.findById(
      command.communityId,
      command.rehearsalId,
    );
    if (!rehearsal) {
      throw new RehearsalNotFoundError(command.rehearsalId);
    }
    const removed = await this.repository.removeEntry(
      rehearsal.id,
      command.entryId,
    );
    if (!removed) {
      throw new RehearsalEntryNotFoundError(command.entryId);
    }
  }
}
