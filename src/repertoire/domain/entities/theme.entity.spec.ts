import { ThemeArchivedError } from '../errors/repertoire.errors';
import { Theme } from './theme.entity';

describe('Theme Entity', () => {
  it('creates and reconstitutes theme properly', () => {
    const theme = Theme.create({
      communityId: 'comm-1',
      name: 'Praise',
    });

    expect(theme.communityId).toBe('comm-1');
    expect(theme.nameValue).toBe('Praise');
    expect(theme.nameKey).toBe('praise');
    expect(theme.isArchived).toBe(false);
  });

  it('renames theme and enforces non-archived rule', () => {
    const theme = Theme.create({
      communityId: 'comm-1',
      name: 'Praise',
    });

    theme.rename('Worship');
    expect(theme.nameValue).toBe('Worship');
    expect(theme.nameKey).toBe('worship');

    theme.archive(new Date());
    expect(() => theme.rename('Prayer')).toThrow(ThemeArchivedError);

    theme.restore();
    expect(theme.isArchived).toBe(false);
  });
});
