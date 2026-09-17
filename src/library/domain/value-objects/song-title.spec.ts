import { LibraryValueInvalidError } from '../errors/library.errors';
import { SongTitle } from './song-title';

describe('SongTitle', () => {
  it('trims whitespace from title', () => {
    const title = new SongTitle('   Grosser Gott, wir loben dich   ');
    expect(title.value).toBe('Grosser Gott, wir loben dich');
    expect(title.toString()).toBe('Grosser Gott, wir loben dich');
  });

  it('accepts title up to 200 characters', () => {
    const valid = 'x'.repeat(200);
    const title = new SongTitle(valid);
    expect(title.value).toBe(valid);
  });

  it('throws LibraryValueInvalidError for empty or whitespace-only title', () => {
    expect(() => new SongTitle('')).toThrow(LibraryValueInvalidError);
    expect(() => new SongTitle('   ')).toThrow(LibraryValueInvalidError);
  });

  it('throws LibraryValueInvalidError for titles longer than 200 characters', () => {
    const tooLong = 'x'.repeat(201);
    expect(() => new SongTitle(tooLong)).toThrow(LibraryValueInvalidError);
    expect(() => new SongTitle(tooLong)).toThrow(
      expect.objectContaining({ field: 'title' }),
    );
  });

  it('throws LibraryValueInvalidError for non-string', () => {
    expect(() => new SongTitle(123 as any)).toThrow(LibraryValueInvalidError);
  });

  it('equals() compares title value', () => {
    expect(new SongTitle('A').equals(new SongTitle('A'))).toBe(true);
    expect(new SongTitle('A').equals(new SongTitle('B'))).toBe(false);
  });
});
