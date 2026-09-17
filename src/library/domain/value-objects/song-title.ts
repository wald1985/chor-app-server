import { LibraryValueInvalidError } from '../errors/library.errors';

export class SongTitle {
  readonly value: string;

  constructor(raw: string) {
    if (typeof raw !== 'string') {
      throw new LibraryValueInvalidError('title');
    }
    const trimmed = raw.trim();
    if (trimmed.length < 1 || trimmed.length > 200) {
      throw new LibraryValueInvalidError('title');
    }
    this.value = trimmed;
  }

  equals(other: SongTitle): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
