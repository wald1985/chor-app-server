import { LibraryValueInvalidError } from '../errors/library.errors';
import { Volume } from './volume';

describe('Volume', () => {
  it.each([1, 2, 50, 99])('accepts valid volume integer %i', (val) => {
    const vol = new Volume(val);
    expect(vol.value).toBe(val);
    expect(vol.toNumber()).toBe(val);
    expect(vol.toString()).toBe(val.toString());
  });

  it.each([0, -1, 100, 1000, 1.5, NaN, Infinity])(
    'throws LibraryValueInvalidError for invalid volume %p',
    (invalid) => {
      expect(() => new Volume(invalid as any)).toThrow(
        LibraryValueInvalidError,
      );
      expect(() => new Volume(invalid as any)).toThrow(
        expect.objectContaining({ field: 'volume' }),
      );
    },
  );

  it('equals() compares volume value', () => {
    expect(new Volume(1).equals(new Volume(1))).toBe(true);
    expect(new Volume(1).equals(new Volume(2))).toBe(false);
  });
});
