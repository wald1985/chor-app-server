import { LibraryValueInvalidError } from '../errors/library.errors';

export class LibraryTitle {
  readonly value: string;
  readonly key: string;

  constructor(raw: string) {
    if (typeof raw !== 'string') {
      throw new LibraryValueInvalidError('title');
    }
    const normalized = raw.trim().replace(/\s+/g, ' ');
    if (normalized.length < 1 || normalized.length > 100) {
      throw new LibraryValueInvalidError('title');
    }
    this.value = normalized;
    this.key = normalized.toLowerCase();
  }

  equals(other: LibraryTitle): boolean {
    return this.key === other.key;
  }

  toString(): string {
    return this.value;
  }
}
