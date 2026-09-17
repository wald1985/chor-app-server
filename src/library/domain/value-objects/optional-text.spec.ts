import { LibraryValueInvalidError } from '../errors/library.errors';
import { OptionalText } from './optional-text';

describe('OptionalText', () => {
  it('returns null for undefined, null, or empty string', () => {
    expect(new OptionalText().value).toBeNull();
    expect(new OptionalText(undefined).value).toBeNull();
    expect(new OptionalText(null).value).toBeNull();
    expect(new OptionalText('').value).toBeNull();
    expect(new OptionalText('   ').value).toBeNull();
  });

  it('trims non-empty string and stores value', () => {
    const text = new OptionalText('  Johann Sebastian Bach  ', 'author');
    expect(text.value).toBe('Johann Sebastian Bach');
    expect(text.toString()).toBe('Johann Sebastian Bach');
  });

  it('accepts string of 200 characters', () => {
    const valid = 'a'.repeat(200);
    const text = new OptionalText(valid, 'author');
    expect(text.value).toBe(valid);
  });

  it('throws LibraryValueInvalidError for strings longer than 200 characters', () => {
    const tooLong = 'a'.repeat(201);
    expect(() => new OptionalText(tooLong, 'author')).toThrow(
      LibraryValueInvalidError,
    );
    expect(() => new OptionalText(tooLong, 'author')).toThrow(
      expect.objectContaining({ field: 'author' }),
    );
  });

  it('throws LibraryValueInvalidError for non-string types', () => {
    expect(() => new OptionalText(123 as any, 'arranger')).toThrow(
      LibraryValueInvalidError,
    );
  });

  it('equals() compares text value', () => {
    expect(new OptionalText('Bach').equals(new OptionalText('Bach'))).toBe(
      true,
    );
    expect(new OptionalText(null).equals(new OptionalText(null))).toBe(true);
    expect(new OptionalText('Bach').equals(new OptionalText('Mozart'))).toBe(
      false,
    );
  });
});
