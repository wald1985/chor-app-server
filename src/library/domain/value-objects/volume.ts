import { LibraryValueInvalidError } from '../errors/library.errors';

export class Volume {
  readonly value: number;

  constructor(raw: number) {
    if (
      typeof raw !== 'number' ||
      !Number.isInteger(raw) ||
      raw < 1 ||
      raw > 99
    ) {
      throw new LibraryValueInvalidError('volume');
    }
    this.value = raw;
  }

  equals(other: Volume): boolean {
    return this.value === other.value;
  }

  toNumber(): number {
    return this.value;
  }

  toString(): string {
    return this.value.toString();
  }
}
