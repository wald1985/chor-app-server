import {
  FolderArchivedError,
  FolderSongArchivedError,
} from '../errors/repertoire.errors';
import { Folder } from './folder.entity';
import { FolderSong } from './folder-song.entity';

describe('FolderSong Entity', () => {
  let activeFolder: Folder;
  let archivedFolder: Folder;

  beforeEach(() => {
    activeFolder = Folder.reconstitute({
      id: 'f-1',
      communityId: 'comm-1',
      title: 'Mappe',
      archivedAt: null,
    });

    archivedFolder = Folder.reconstitute({
      id: 'f-2',
      communityId: 'comm-1',
      title: 'Old Mappe',
      archivedAt: new Date(),
    });
  });

  it('creates a folder song in an active folder', () => {
    const song = FolderSong.create(activeFolder, {
      number: '12',
      title: 'Amazing Grace',
      author: 'John Newton',
      arranger: null,
      isNew: true,
    });

    expect(song.folderId).toBe('f-1');
    expect(song.communityId).toBe('comm-1');
    expect(song.numberValue).toBe('12');
    expect(song.numberKey).toBe('12');
    expect(song.sortKey).toBe('00000012');
    expect(song.titleValue).toBe('Amazing Grace');
    expect(song.authorValue).toBe('John Newton');
    expect(song.arrangerValue).toBeNull();
    expect(song.isNew).toBe(true);
    expect(song.isArchived).toBe(false);
  });

  it('throws FolderArchivedError when creating song in archived folder', () => {
    expect(() =>
      FolderSong.create(archivedFolder, {
        number: '1',
        title: 'Song',
      }),
    ).toThrow(FolderArchivedError);
  });

  it('updates song properties and renumbers', () => {
    const song = FolderSong.create(activeFolder, {
      number: '1',
      title: 'Song',
    });

    song.update({
      title: 'Updated Song',
      author: 'New Author',
      arranger: 'Arranger',
      isNew: true,
    });

    expect(song.titleValue).toBe('Updated Song');
    expect(song.authorValue).toBe('New Author');
    expect(song.arrangerValue).toBe('Arranger');
    expect(song.isNew).toBe(true);

    song.renumber('2b');
    expect(song.numberValue).toBe('2b');
    expect(song.sortKey).toBe('00000002b');
  });

  it('archives, restores, and prevents updates when archived', () => {
    const song = FolderSong.create(activeFolder, {
      number: '1',
      title: 'Song',
    });

    const now = new Date();
    song.archive(now);
    expect(song.isArchived).toBe(true);
    expect(song.archivedAt).toBe(now);

    expect(() => song.update({ title: 'New' })).toThrow(
      FolderSongArchivedError,
    );
    expect(() => song.renumber('2')).toThrow(FolderSongArchivedError);

    song.restore();
    expect(song.isArchived).toBe(false);
    expect(song.archivedAt).toBeNull();
  });
});
