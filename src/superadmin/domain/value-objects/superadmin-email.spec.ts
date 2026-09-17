import { InvalidSuperadminValueError } from '../errors/superadmin.errors';
import { SuperadminEmail } from './superadmin-email';

describe('SuperadminEmail', () => {
  it('trims and lowercases the value', () => {
    const email = new SuperadminEmail('  Alex@Example.ORG ');
    expect(email.value).toBe('alex@example.org');
  });

  it('throws for a value without @', () => {
    expect(() => new SuperadminEmail('not-an-email')).toThrow(
      InvalidSuperadminValueError,
    );
  });

  it('throws for a value with 255 characters', () => {
    const local = 'a'.repeat(255 - '@example.com'.length);
    expect(() => new SuperadminEmail(`${local}@example.com`)).toThrow(
      InvalidSuperadminValueError,
    );
  });

  it('accepts a value at the 254 character limit', () => {
    const local = 'a'.repeat(254 - '@example.com'.length);
    const email = new SuperadminEmail(`${local}@example.com`);
    expect(email.value.length).toBe(254);
  });

  it('equals() compares normalized values', () => {
    const a = new SuperadminEmail('Alex@example.org');
    const b = new SuperadminEmail(' alex@EXAMPLE.org ');
    expect(a.equals(b)).toBe(true);
  });
});
