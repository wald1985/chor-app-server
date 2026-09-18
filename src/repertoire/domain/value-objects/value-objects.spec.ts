import { RepertoireValueInvalidError } from '../errors/repertoire.errors';
import { FolderTitle } from './folder-title';
import { OptionalText } from './optional-text';
import { SongNumber } from './song-number';
import { SongTitle } from './song-title';
import { ThemeName } from './theme-name';
import { ThemeSource } from './theme-source';

describe('Repertoire Value Objects', () => {
  describe('FolderTitle', () => {
    it('creates normalized folder title and lowercase key', () => {
      const title = new FolderTitle('  Mappe  2026 ');
      expect(title.value).toBe('Mappe 2026');
      expect(title.key).toBe('mappe 2026');
      expect(title.toString()).toBe('Mappe 2026');
    });

    it('throws on empty or non-string title', () => {
      expect(() => new FolderTitle('')).toThrow(RepertoireValueInvalidError);
      expect(() => new FolderTitle('   ')).toThrow(RepertoireValueInvalidError);
      expect(() => new FolderTitle(null as any)).toThrow(
        RepertoireValueInvalidError,
      );
    });

    it('throws when title exceeds 100 characters', () => {
      expect(() => new FolderTitle('a'.repeat(101))).toThrow(
        RepertoireValueInvalidError,
      );
    });

    it('compares equality based on key', () => {
      const t1 = new FolderTitle('Folder 1');
      const t2 = new FolderTitle('folder 1');
      const t3 = new FolderTitle('Folder 2');
      expect(t1.equals(t2)).toBe(true);
      expect(t1.equals(t3)).toBe(false);
    });
  });

  describe('SongNumber', () => {
    it('creates number and formats sortKey', () => {
      const num1 = new SongNumber('42');
      expect(num1.value).toBe('42');
      expect(num1.key).toBe('42');
      expect(num1.sortKey).toBe('00000042');

      const num2 = new SongNumber('42a');
      expect(num2.value).toBe('42a');
      expect(num2.key).toBe('42a');
      expect(num2.sortKey).toBe('00000042a');

      const num3 = new SongNumber(105);
      expect(num3.value).toBe('105');
      expect(num3.sortKey).toBe('00000105');
    });

    it('throws on invalid number formats', () => {
      expect(() => new SongNumber('')).toThrow(RepertoireValueInvalidError);
      expect(() => new SongNumber('-5')).toThrow(RepertoireValueInvalidError);
      expect(() => new SongNumber('abc')).toThrow(RepertoireValueInvalidError);
      expect(() => new SongNumber('1234567')).toThrow(
        RepertoireValueInvalidError,
      );
    });

    it('checks equality', () => {
      const n1 = new SongNumber('12A');
      const n2 = new SongNumber('12a');
      expect(n1.equals(n2)).toBe(true);
    });
  });

  describe('SongTitle', () => {
    it('normalizes spaces', () => {
      const title = new SongTitle('  Great   Grace  ');
      expect(title.value).toBe('Great Grace');
      expect(title.toString()).toBe('Great Grace');
    });

    it('throws on invalid title', () => {
      expect(() => new SongTitle('')).toThrow(RepertoireValueInvalidError);
      expect(() => new SongTitle('   ')).toThrow(RepertoireValueInvalidError);
      expect(() => new SongTitle('a'.repeat(201))).toThrow(
        RepertoireValueInvalidError,
      );
    });
  });

  describe('OptionalText', () => {
    it('handles null, undefined, empty text, and valid text', () => {
      expect(new OptionalText(null, 'author').value).toBeNull();
      expect(new OptionalText(undefined, 'author').value).toBeNull();
      expect(new OptionalText('   ', 'author').value).toBeNull();
      expect(new OptionalText(' Bach ', 'author').value).toBe('Bach');
    });

    it('throws if length exceeds max', () => {
      expect(() => new OptionalText('a'.repeat(101), 'author', 100)).toThrow(
        RepertoireValueInvalidError,
      );
    });
  });

  describe('ThemeName', () => {
    it('normalizes theme name and key', () => {
      const theme = new ThemeName('  Worship  Song ');
      expect(theme.value).toBe('Worship Song');
      expect(theme.key).toBe('worship song');
    });

    it('disallows pipes and empty strings', () => {
      expect(() => new ThemeName('Theme | Other')).toThrow(
        RepertoireValueInvalidError,
      );
      expect(() => new ThemeName('')).toThrow(RepertoireValueInvalidError);
    });
  });

  describe('ThemeSource', () => {
    it('has LIBRARY and COMMUNITY sources', () => {
      expect(ThemeSource.LIBRARY).toBe('LIBRARY');
      expect(ThemeSource.COMMUNITY).toBe('COMMUNITY');
    });
  });
});
