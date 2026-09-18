import { FolderArchivedError } from '../errors/repertoire.errors';
import { Folder } from './folder.entity';

describe('Folder Entity', () => {
  it('creates and reconstitutes folder properly', () => {
    const folder = Folder.create({
      communityId: 'comm-1',
      title: 'Mappe',
    });

    expect(folder.id).toBe('');
    expect(folder.communityId).toBe('comm-1');
    expect(folder.titleValue).toBe('Mappe');
    expect(folder.titleKey).toBe('mappe');
    expect(folder.isArchived).toBe(false);

    const reconstituted = Folder.reconstitute({
      id: 'f-1',
      communityId: 'comm-1',
      title: 'Chor',
      archivedAt: null,
    });
    expect(reconstituted.id).toBe('f-1');
    expect(reconstituted.titleValue).toBe('Chor');
  });

  it('renames folder when not archived', () => {
    const folder = Folder.create({
      communityId: 'comm-1',
      title: 'Old Title',
    });
    folder.rename('New Title');
    expect(folder.titleValue).toBe('New Title');
    expect(folder.titleKey).toBe('new title');
  });

  it('archives and restores folder', () => {
    const folder = Folder.create({
      communityId: 'comm-1',
      title: 'Mappe',
    });

    const now = new Date();
    folder.archive(now);
    expect(folder.isArchived).toBe(true);
    expect(folder.archivedAt).toBe(now);

    // Archiving again is idempotent
    folder.archive(new Date(now.getTime() + 1000));
    expect(folder.archivedAt).toBe(now);

    expect(() => folder.rename('Another Title')).toThrow(FolderArchivedError);

    folder.restore();
    expect(folder.isArchived).toBe(false);
    expect(folder.archivedAt).toBeNull();
  });
});
