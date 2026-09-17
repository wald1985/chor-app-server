import { LibraryValueInvalidError } from '../errors/library.errors';
import { LibraryTitle } from './library-title';

describe('LibraryTitle', () => {
  it('collapses multiple whitespace characters and trims', () => {
    const title = new LibraryTitle('   Gesangbuch   der   Gemeinde   ');
    expect(title.value).toBe('Gesangbuch der Gemeinde');
    expect(title.key).toBe('gesangbuch der gemeinde');
  });

  it('accepts title with commas and special characters', () => {
    const title = new LibraryTitle('Evangelisation, Zuruf');
    expect(title.value).toBe('Evangelisation, Zuruf');
    expect(title.key).toBe('evangelisation, zuruf');
  });

  it('accepts title with exactly 100 characters', () => {
    const hundredChars = 'a'.repeat(100);
    const title = new LibraryTitle(hundredChars);
    expect(title.value).toBe(hundredChars);
  });

  it('throws LibraryValueInvalidError for 101 characters', () => {
    const tooLong = 'a'.repeat(101);
    expect(() => new LibraryTitle(tooLong)).toThrow(LibraryValueInvalidError);
    expect(() => new LibraryTitle(tooLong)).toThrow(
      expect.objectContaining({ field: 'title' }),
    );
  });

  it('throws LibraryValueInvalidError for empty or whitespace-only strings', () => {
    expect(() => new LibraryTitle('')).toThrow(LibraryValueInvalidError);
    expect(() => new LibraryTitle('    ')).toThrow(LibraryValueInvalidError);
  });

  it('equals() compares by key case-insensitively', () => {
    const t1 = new LibraryTitle('Bücher');
    const t2 = new LibraryTitle('  bücher  ');
    expect(t1.equals(t2)).toBe(true);
  });
});
