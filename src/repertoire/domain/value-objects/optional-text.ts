import { RepertoireValueInvalidError } from '../errors/repertoire.errors';

export class OptionalText {
  readonly value: string | null;

  constructor(raw: string | null | undefined, field: string, maxLength = 100) {
    if (raw === null || raw === undefined) {
      this.value = null;
      return;
    }
    if (typeof raw !== 'string') {
      throw new RepertoireValueInvalidError(field);
    }
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      this.value = null;
      return;
    }
    if (trimmed.length > maxLength) {
      throw new RepertoireValueInvalidError(field);
    }
    this.value = trimmed;
  }

  toString(): string {
    return this.value ?? '';
  }
}
