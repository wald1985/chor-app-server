import { LibraryValueInvalidError } from '../errors/library.errors';

export class OptionalText {
  readonly value: string | null;

  constructor(raw?: string | null, field: string = 'text') {
    if (raw === undefined || raw === null) {
      this.value = null;
      return;
    }
    if (typeof raw !== 'string') {
      throw new LibraryValueInvalidError(field);
    }
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      this.value = null;
      return;
    }
    if (trimmed.length > 200) {
      throw new LibraryValueInvalidError(field);
    }
    this.value = trimmed;
  }

  equals(other: OptionalText): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value ?? '';
  }
}
