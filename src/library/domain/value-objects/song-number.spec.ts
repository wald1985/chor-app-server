import { LibraryValueInvalidError } from '../errors/library.errors';
import { SongNumber } from './song-number';

describe('SongNumber', () => {
  describe('normalization and properties', () => {
    it('normalizes internal and surrounding spaces: " 22 a" -> 22a', () => {
      const num = new SongNumber(' 22 a');
      expect(num.value).toBe('22a');
      expect(num.key).toBe('22a');
      expect(num.sortKey).toBe('00000022a');
    });

    it('keeps casing in value, lowercases in key: 22A -> key 22a', () => {
      const num = new SongNumber('22A');
      expect(num.value).toBe('22A');
      expect(num.key).toBe('22a');
      expect(num.sortKey).toBe('00000022a');
    });

    it('converts integer 22 to string "22"', () => {
      const num = new SongNumber(22);
      expect(num.value).toBe('22');
      expect(num.key).toBe('22');
      expect(num.sortKey).toBe('00000022');
    });

    it.each([
      { input: '22', expectedSortKey: '00000022' },
      { input: '22b', expectedSortKey: '00000022b' },
      { input: '100', expectedSortKey: '00000100' },
      { input: 1, expectedSortKey: '00000001' },
      { input: '999999xyz', expectedSortKey: '00999999xyz' },
    ])(
      'computes sortKey for $input -> $expectedSortKey',
      ({ input, expectedSortKey }) => {
        const num = new SongNumber(input);
        expect(num.sortKey).toBe(expectedSortKey);
      },
    );

    it('sorts correctly: 22 < 22a < 22b < 100', () => {
      const numbers = [
        new SongNumber(100),
        new SongNumber('22b'),
        new SongNumber('22 a'),
        new SongNumber(22),
      ];

      const sorted = [...numbers].sort((a, b) =>
        a.sortKey.localeCompare(b.sortKey),
      );

      expect(sorted.map((n) => n.value)).toEqual(['22', '22a', '22b', '100']);
    });

    it('equals() compares by key', () => {
      const a = new SongNumber('22A');
      const b = new SongNumber(' 22 a ');
      expect(a.equals(b)).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it.each([
      '22-1',
      'II',
      '1234567',
      '22abcd',
      '',
      '   ',
      'abc',
      '22.5',
      -1,
      1.5,
    ])('throws LibraryValueInvalidError for %p', (invalid) => {
      expect(() => new SongNumber(invalid as any)).toThrow(
        LibraryValueInvalidError,
      );
      expect(() => new SongNumber(invalid as any)).toThrow(
        expect.objectContaining({ field: 'number' }),
      );
    });
  });
});
