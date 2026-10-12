import { RehearsalEntry } from '../entities/rehearsal-entry.entity';
import { Rehearsal } from '../entities/rehearsal.entity';
import { RehearsalDate } from '../value-objects/rehearsal-date';

export const REHEARSAL_REPOSITORY = Symbol('REHEARSAL_REPOSITORY');

export interface RehearsalWithCount {
  rehearsal: Rehearsal;
  entryCount: number;
}

export type DeleteRehearsalOutcome = 'deleted' | 'not_found' | 'not_empty';

export interface RehearsalRepository {
  findById(communityId: string, id: string): Promise<Rehearsal | null>;
  findByDate(
    communityId: string,
    date: RehearsalDate,
  ): Promise<Rehearsal | null>;
  list(
    communityId: string,
    range: { from?: RehearsalDate; to?: RehearsalDate },
  ): Promise<RehearsalWithCount[]>;
  /** Inserts or updates the header. Throws RehearsalDateTakenError on a date clash. */
  save(rehearsal: Rehearsal): Promise<void>;
  /** Deletes only a rehearsal without entries, atomically. */
  deleteIfEmpty(
    communityId: string,
    id: string,
  ): Promise<DeleteRehearsalOutcome>;

  listEntries(rehearsalId: string): Promise<RehearsalEntry[]>;
  addEntry(entry: RehearsalEntry): Promise<void>;
  removeEntry(rehearsalId: string, entryId: string): Promise<boolean>;
}
