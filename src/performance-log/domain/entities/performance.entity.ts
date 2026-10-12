import { randomUUID } from 'node:crypto';
import { PerformanceDate } from '../value-objects/performance-date';
import { parsePerformanceNote } from '../value-objects/performance-note';

export interface PerformanceProps {
  id: string;
  communityId: string;
  date: PerformanceDate;
  songId: string;
  pianistId: string | null;
  conductorId: string | null;
  note: string | null;
  createdAt?: Date;
}

export interface PerformanceInit {
  id?: string;
  communityId: string;
  date: PerformanceDate | string;
  songId: string;
  pianistId?: string | null;
  conductorId?: string | null;
  note?: string | null;
  createdAt?: Date;
}

/** One song sung on one date, outside of any rehearsal. Immutable once recorded. */
export class Performance {
  private constructor(private readonly props: PerformanceProps) {}

  static create(init: PerformanceInit): Performance {
    return Performance.build({ ...init, id: init.id ?? randomUUID() });
  }

  static reconstitute(init: PerformanceInit & { id: string }): Performance {
    return Performance.build(init);
  }

  private static build(init: PerformanceInit & { id: string }): Performance {
    return new Performance({
      id: init.id,
      communityId: init.communityId,
      date:
        init.date instanceof PerformanceDate
          ? init.date
          : new PerformanceDate(init.date),
      songId: init.songId,
      pianistId: init.pianistId ?? null,
      conductorId: init.conductorId ?? null,
      note: parsePerformanceNote(init.note),
      createdAt: init.createdAt,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get communityId(): string {
    return this.props.communityId;
  }

  get date(): PerformanceDate {
    return this.props.date;
  }

  get songId(): string {
    return this.props.songId;
  }

  get pianistId(): string | null {
    return this.props.pianistId;
  }

  get conductorId(): string | null {
    return this.props.conductorId;
  }

  get note(): string | null {
    return this.props.note;
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }
}
