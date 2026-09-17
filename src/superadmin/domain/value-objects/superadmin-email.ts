import { InvalidSuperadminValueError } from '../errors/superadmin.errors';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LENGTH = 254;

export class SuperadminEmail {
  readonly value: string;

  constructor(raw: string) {
    const trimmed = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
    if (
      trimmed.length === 0 ||
      trimmed.length > MAX_LENGTH ||
      !EMAIL_REGEX.test(trimmed)
    ) {
      throw new InvalidSuperadminValueError('email');
    }
    this.value = trimmed;
  }

  equals(other: SuperadminEmail): boolean {
    return this.value === other.value;
  }
}
