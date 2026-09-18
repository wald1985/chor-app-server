import { RepertoireValueInvalidError } from '../errors/repertoire.errors';

export class FolderTitle {
  readonly value: string;
  readonly key: string;

  constructor(raw: string) {
    if (typeof raw !== 'string') {
      throw new RepertoireValueInvalidError('title');
    }
    const normalized = raw.trim().replace(/\s+/g, ' ');
    if (normalized.length < 1 || normalized.length > 100) {
      throw new RepertoireValueInvalidError('title');
    }
    this.value = normalized;
    this.key = normalized.toLowerCase();
  }

  equals(other: FolderTitle): boolean {
    return this.key === other.key;
  }

  toString(): string {
    return this.value;
  }
}
