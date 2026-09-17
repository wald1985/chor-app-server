import { InvalidSuperadminValueError } from '../errors/superadmin.errors';

const MIN_LENGTH = 2;
const MAX_LENGTH = 100;

export class SuperadminName {
  readonly value: string;

  constructor(raw: string) {
    const trimmed = typeof raw === 'string' ? raw.trim() : '';
    if (trimmed.length < MIN_LENGTH || trimmed.length > MAX_LENGTH) {
      throw new InvalidSuperadminValueError('name');
    }
    this.value = trimmed;
  }

  equals(other: SuperadminName): boolean {
    return this.value === other.value;
  }
}
