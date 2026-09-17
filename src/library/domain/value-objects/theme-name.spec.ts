import { LibraryValueInvalidError } from '../errors/library.errors';
import { ThemeName } from './theme-name';

describe('ThemeName', () => {
  it('collapses multiple whitespace characters and trims', () => {
    const theme = new ThemeName('  Lob   und   Dank  ');
    expect(theme.value).toBe('Lob und Dank');
    expect(theme.key).toBe('lob und dank');
  });

  it('accepts names with commas like "Evangelisation, Zuruf"', () => {
    const theme = new ThemeName('Evangelisation, Zuruf');
    expect(theme.value).toBe('Evangelisation, Zuruf');
    expect(theme.key).toBe('evangelisation, zuruf');
  });

  it('rejects names containing pipe character "|"', () => {
    expect(() => new ThemeName('a|b')).toThrow(LibraryValueInvalidError);
    expect(() => new ThemeName('a|b')).toThrow(
      expect.objectContaining({ field: 'name' }),
    );
  });

  it('accepts name with exactly 100 characters', () => {
    const valid = 't'.repeat(100);
    const theme = new ThemeName(valid);
    expect(theme.value).toBe(valid);
  });

  it('rejects name with 101 characters', () => {
    const tooLong = 't'.repeat(101);
    expect(() => new ThemeName(tooLong)).toThrow(LibraryValueInvalidError);
  });

  it('rejects empty or whitespace-only name', () => {
    expect(() => new ThemeName('')).toThrow(LibraryValueInvalidError);
    expect(() => new ThemeName('   ')).toThrow(LibraryValueInvalidError);
  });

  it('equals() compares by key', () => {
    const t1 = new ThemeName('Glaube und Vertrauen');
    const t2 = new ThemeName('  glaube   und vertrauen  ');
    expect(t1.equals(t2)).toBe(true);
  });
});
