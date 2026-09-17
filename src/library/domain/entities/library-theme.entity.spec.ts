import { ThemeArchivedError } from '../errors/library.errors';
import { ThemeName } from '../value-objects/theme-name';
import { LibraryTheme } from './library-theme.entity';

describe('LibraryTheme', () => {
  it('creates theme and derives nameKey', () => {
    const theme = LibraryTheme.create({
      id: 'theme-1',
      name: 'Lob und Dank',
    });

    expect(theme.id).toBe('theme-1');
    expect(theme.nameValue).toBe('Lob und Dank');
    expect(theme.nameKey).toBe('lob und dank');
    expect(theme.isArchived).toBe(false);
    expect(theme.archivedAt).toBeNull();
  });

  it('renames theme when active', () => {
    const theme = LibraryTheme.create({
      id: 'theme-1',
      name: 'Lob',
    });

    theme.rename('Lob und Anbetung');
    expect(theme.nameValue).toBe('Lob und Anbetung');
    expect(theme.nameKey).toBe('lob und anbetung');

    theme.rename(new ThemeName('Anbetung'));
    expect(theme.nameValue).toBe('Anbetung');
  });

  it('archive and restore are idempotent', () => {
    const theme = LibraryTheme.create({
      id: 'theme-1',
      name: 'Thema',
    });
    const now1 = new Date('2026-07-01');
    const now2 = new Date('2026-08-01');

    // Restore when active does nothing
    theme.restore();
    expect(theme.isArchived).toBe(false);

    // Archive
    theme.archive(now1);
    expect(theme.isArchived).toBe(true);
    expect(theme.archivedAt).toBe(now1);

    // Re-archive preserves original date
    theme.archive(now2);
    expect(theme.archivedAt).toBe(now1);

    // Restore
    theme.restore();
    expect(theme.isArchived).toBe(false);
    expect(theme.archivedAt).toBeNull();

    // Re-restore
    theme.restore();
    expect(theme.isArchived).toBe(false);
  });

  it('throws ThemeArchivedError when renaming archived theme', () => {
    const theme = LibraryTheme.create({
      id: 'theme-1',
      name: 'Archived',
      archivedAt: new Date(),
    });

    expect(() => theme.rename('New Name')).toThrow(ThemeArchivedError);
    expect(() => theme.rename('New Name')).toThrow(
      expect.objectContaining({ itemType: 'theme', id: 'theme-1' }),
    );
  });
});
