import { randomUUID } from 'node:crypto';
import { RehearsalDate } from '../value-objects/rehearsal-date';
import { parseRehearsalNote } from '../value-objects/rehearsal-note';

export interface RehearsalProps {
  id: string;
  communityId: string;
  date: RehearsalDate;
  warmUpLeaderId: string | null;
  note: string | null;
  createdAt?: Date;
}

export interface RehearsalInit {
  id?: string;
  communityId: string;
  date: RehearsalDate | string;
  warmUpLeaderId?: string | null;
  note?: string | null;
  createdAt?: Date;
}

/**
 * One rehearsal session on a calendar date. Only the header lives here; the
 * songs are `RehearsalEntry` rows that cannot exist without their rehearsal
 * and are added/removed one at a time (no whole-list rewrites, so two people
 * adding songs at once cannot overwrite each other).
 */
export class Rehearsal {
  private constructor(private readonly props: RehearsalProps) {}

  static create(init: RehearsalInit): Rehearsal {
    return Rehearsal.build({ ...init, id: init.id ?? randomUUID() });
  }

  static reconstitute(init: RehearsalInit & { id: string }): Rehearsal {
    return Rehearsal.build(init);
  }

  private static build(init: RehearsalInit & { id: string }): Rehearsal {
    return new Rehearsal({
      id: init.id,
      communityId: init.communityId,
      date:
        init.date instanceof RehearsalDate
          ? init.date
          : new RehearsalDate(init.date),
      warmUpLeaderId: init.warmUpLeaderId ?? null,
      note: parseRehearsalNote(init.note),
      createdAt: init.createdAt,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get communityId(): string {
    return this.props.communityId;
  }

  get date(): RehearsalDate {
    return this.props.date;
  }

  get warmUpLeaderId(): string | null {
    return this.props.warmUpLeaderId;
  }

  get note(): string | null {
    return this.props.note;
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  changeWarmUpLeader(personId: string | null): void {
    this.props.warmUpLeaderId = personId;
  }

  changeNote(note: string | null): void {
    this.props.note = parseRehearsalNote(note);
  }
}
