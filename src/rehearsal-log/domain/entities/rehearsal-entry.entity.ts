import { randomUUID } from 'node:crypto';
import { parseRehearsalNote } from '../value-objects/rehearsal-note';

export interface RehearsalEntryInit {
  id?: string;
  rehearsalId: string;
  songId: string;
  pianistId?: string | null;
  conductorId?: string | null;
  note?: string | null;
  createdAt?: Date;
}

/** One practised song of a rehearsal. Immutable: remove and add again to correct it. */
export class RehearsalEntry {
  readonly id: string;
  readonly rehearsalId: string;
  readonly songId: string;
  readonly pianistId: string | null;
  readonly conductorId: string | null;
  readonly note: string | null;
  readonly createdAt?: Date;

  private constructor(init: RehearsalEntryInit & { id: string }) {
    this.id = init.id;
    this.rehearsalId = init.rehearsalId;
    this.songId = init.songId;
    this.pianistId = init.pianistId ?? null;
    this.conductorId = init.conductorId ?? null;
    this.note = parseRehearsalNote(init.note);
    this.createdAt = init.createdAt;
  }

  static create(init: RehearsalEntryInit): RehearsalEntry {
    return new RehearsalEntry({ ...init, id: init.id ?? randomUUID() });
  }

  static reconstitute(init: RehearsalEntryInit & { id: string }) {
    return new RehearsalEntry(init);
  }
}
