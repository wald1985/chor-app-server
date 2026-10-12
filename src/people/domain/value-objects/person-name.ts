import { PersonValueInvalidError } from '../errors/people.errors';

export class PersonName {
  readonly value: string;
  readonly key: string;

  constructor(raw: string) {
    if (typeof raw !== 'string') {
      throw new PersonValueInvalidError('name');
    }
    const normalized = raw.trim().replace(/\s+/g, ' ');
    if (normalized.length < 1 || normalized.length > 100) {
      throw new PersonValueInvalidError('name');
    }
    this.value = normalized;
    this.key = normalized.toLowerCase();
  }

  equals(other: PersonName): boolean {
    return this.key === other.key;
  }

  toString(): string {
    return this.value;
  }
}
