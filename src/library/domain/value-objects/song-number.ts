import { LibraryValueInvalidError } from '../errors/library.errors';

export class SongNumber {
  readonly value: string;
  readonly key: string;
  readonly sortKey: string;

  constructor(raw: string | number) {
    let str: string;
    if (typeof raw === 'number') {
      if (!Number.isInteger(raw) || raw < 0) {
        throw new LibraryValueInvalidError('number');
      }
      str = raw.toString();
    } else if (typeof raw === 'string') {
      str = raw;
    } else {
      throw new LibraryValueInvalidError('number');
    }

    const stripped = str.replace(/\s+/g, '');
    const match = stripped.match(/^([0-9]{1,6})([a-zA-Z]{0,3})$/);
    if (!match || stripped.length === 0) {
      throw new LibraryValueInvalidError('number');
    }

    const [, numPart, suffix] = match;
    this.value = stripped;
    this.key = stripped.toLowerCase();
    this.sortKey = `${numPart.padStart(8, '0')}${suffix.toLowerCase()}`;
  }

  equals(other: SongNumber): boolean {
    return this.key === other.key;
  }

  toString(): string {
    return this.value;
  }
}
