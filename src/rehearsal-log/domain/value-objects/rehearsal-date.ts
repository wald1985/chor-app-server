import { RehearsalValueInvalidError } from '../errors/rehearsal-log.errors';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A calendar date ("YYYY-MM-DD"), held as UTC midnight so it never shifts with time zones. */
export class RehearsalDate {
  readonly value: Date;

  constructor(raw: string, field = 'date') {
    this.value = RehearsalDate.parse(raw, field);
  }

  static fromDate(date: Date): RehearsalDate {
    return new RehearsalDate(date.toISOString().slice(0, 10));
  }

  get iso(): string {
    return this.value.toISOString().slice(0, 10);
  }

  private static parse(raw: string, field: string): Date {
    const match = typeof raw === 'string' ? ISO_DATE.exec(raw) : null;
    if (!match) {
      throw new RehearsalValueInvalidError(field);
    }
    const [year, month, day] = [
      Number(match[1]),
      Number(match[2]),
      Number(match[3]),
    ];
    const date = new Date(Date.UTC(year, month - 1, day));
    const isRealDate =
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day;
    if (!isRealDate) {
      throw new RehearsalValueInvalidError(field);
    }
    return date;
  }
}
