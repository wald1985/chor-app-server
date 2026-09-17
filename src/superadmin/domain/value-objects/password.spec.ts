import { InvalidSuperadminValueError } from '../errors/superadmin.errors';
import { Password } from './password';

describe('Password', () => {
  it('throws for 7 characters', () => {
    expect(() => new Password('a'.repeat(7))).toThrow(
      InvalidSuperadminValueError,
    );
  });

  it('accepts 8 and 128 characters', () => {
    expect(new Password('a'.repeat(8)).value.length).toBe(8);
    expect(new Password('a'.repeat(128)).value.length).toBe(128);
  });

  it('throws for 129 characters', () => {
    expect(() => new Password('a'.repeat(129))).toThrow(
      InvalidSuperadminValueError,
    );
  });
});
