import { InvalidSuperadminValueError } from '../errors/superadmin.errors';
import { SuperadminName } from './superadmin-name';

describe('SuperadminName', () => {
  it('trims the value', () => {
    expect(new SuperadminName('  Alex  ').value).toBe('Alex');
  });

  it('throws for a single character', () => {
    expect(() => new SuperadminName('A')).toThrow(InvalidSuperadminValueError);
  });

  it('accepts 2 and 100 characters', () => {
    expect(new SuperadminName('Al').value).toBe('Al');
    expect(new SuperadminName('a'.repeat(100)).value.length).toBe(100);
  });

  it('throws for 101 characters', () => {
    expect(() => new SuperadminName('a'.repeat(101))).toThrow(
      InvalidSuperadminValueError,
    );
  });
});
