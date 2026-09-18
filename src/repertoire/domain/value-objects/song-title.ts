import { RepertoireValueInvalidError } from '../errors/repertoire.errors';

export class SongTitle {
  readonly value: string;

  constructor(raw: string) {
    if (typeof raw !== 'string') {
      throw new RepertoireValueInvalidError('title');
    }
    const normalized = raw.trim().replace(/\s+/g, ' ');
    if (normalized.length < 1 || normalized.length > 200) {
      throw new RepertoireValueInvalidError('title');
    }
    this.value = normalized;
  }

  toString(): string {
    return this.value;
  }
}
