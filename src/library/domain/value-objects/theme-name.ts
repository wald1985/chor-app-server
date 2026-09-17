import { LibraryValueInvalidError } from '../errors/library.errors';

export class ThemeName {
  readonly value: string;
  readonly key: string;

  constructor(raw: string) {
    if (typeof raw !== 'string') {
      throw new LibraryValueInvalidError('name');
    }
    if (raw.includes('|')) {
      throw new LibraryValueInvalidError('name');
    }
    const normalized = raw.trim().replace(/\s+/g, ' ');
    if (normalized.length < 1 || normalized.length > 100) {
      throw new LibraryValueInvalidError('name');
    }
    this.value = normalized;
    this.key = normalized.toLowerCase();
  }

  equals(other: ThemeName): boolean {
    return this.key === other.key;
  }

  toString(): string {
    return this.value;
  }
}
