import { InvalidSuperadminValueError } from '../errors/superadmin.errors';

const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

/** Plain-text password after validation, before hashing. Never persisted. */
export class Password {
  readonly value: string;

  constructor(raw: string) {
    if (
      typeof raw !== 'string' ||
      raw.length < MIN_LENGTH ||
      raw.length > MAX_LENGTH
    ) {
      throw new InvalidSuperadminValueError('password');
    }
    this.value = raw;
  }
}
