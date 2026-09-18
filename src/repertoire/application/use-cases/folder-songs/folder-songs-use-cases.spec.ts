import { Folder } from '../../../domain/entities/folder.entity';
import { FolderSong } from '../../../domain/entities/folder-song.entity';
import {
  FolderArchivedError,
  FolderNotFoundError,
  FolderSongArchivedError,
  FolderSongNotFoundError,
  FolderSongNumberConflictError,
} from '../../../domain/errors/repertoire.errors';
import { ThemeSource } from '../../../domain/value-objects/theme-source';
import { ArchiveFolderSongUseCase } from './archive-folder-song.use-case';
import { CreateFolderSongUseCase } from './create-folder-song.use-case';
import { UpdateFolderSongUseCase } from './update-folder-song.use-case';

describe('FolderSong Use Cases', () => {
  let folderRepo: {
    findById: jest.Mock;
    findByCommunityAndTitleKey: jest.Mock;
    findAllByCommunity: jest.Mock;
    save: jest.Mock;
  };
  let folderSongRepo: {
    findById: jest.Mock;
    findByFolderAndNumberKey: jest.Mock;
    findAllByFolder: jest.Mock;
    findAllByCommunity: jest.Mock;
    save: jest.Mock;
  };
  let songThemeAssignmentRepo: {
    findByCommunityId: jest.Mock;
    findByCommunityAndSongId: jest.Mock;
    findByCommunityAndSongIds: jest.Mock;
    setSongThemes: jest.Mock;
  };
  let createSongUseCase: CreateFolderSongUseCase;
  let updateSongUseCase: UpdateFolderSongUseCase;
  let archiveSongUseCase: ArchiveFolderSongUseCase;

  let activeFolder: Folder;
  let archivedFolder: Folder;

  beforeEach(() => {
    folderRepo = {
      findById: jest.fn(),
      findByCommunityAndTitleKey: jest.fn(),
      findAllByCommunity: jest.fn(),
      save: jest.fn(),
    };
    folderSongRepo = {
      findById: jest.fn(),
      findByFolderAndNumberKey: jest.fn(),
      findAllByFolder: jest.fn(),
      findAllByCommunity: jest.fn(),
      save: jest.fn(),
    };
    songThemeAssignmentRepo = {
      findByCommunityId: jest.fn(),
      findByCommunityAndSongId: jest.fn(),
      findByCommunityAndSongIds: jest.fn(),
      setSongThemes: jest.fn(),
    };

    createSongUseCase = new CreateFolderSongUseCase(
      folderRepo,
      folderSongRepo,
      songThemeAssignmentRepo,
    );
    updateSongUseCase = new UpdateFolderSongUseCase(
      folderSongRepo,
      songThemeAssignmentRepo,
    );
    archiveSongUseCase = new ArchiveFolderSongUseCase(folderSongRepo);

    activeFolder = Folder.reconstitute({
      id: 'f-1',
      communityId: 'c-1',
      title: 'Mappe',
      archivedAt: null,
    });

    archivedFolder = Folder.reconstitute({
      id: 'f-2',
      communityId: 'c-1',
      title: 'Old Mappe',
      archivedAt: new Date(),
    });
  });

  describe('CreateFolderSongUseCase', () => {
    it('creates a new folder song with isNew=true by default and saves themes', async () => {
      folderRepo.findById.mockResolvedValue(activeFolder);
      folderSongRepo.findByFolderAndNumberKey.mockResolvedValue(null);

      const song = await createSongUseCase.execute({
        communityId: 'c-1',
        folderId: 'f-1',
        number: '10',
        title: 'Song 10',
        author: 'Author',
        themeIds: ['theme-1', 'theme-2'],
      });

      expect(song.folderId).toBe('f-1');
      expect(song.communityId).toBe('c-1');
      expect(song.numberValue).toBe('10');
      expect(song.titleValue).toBe('Song 10');
      expect(song.isNew).toBe(true);
      expect(folderSongRepo.save).toHaveBeenCalledWith(song);
      expect(songThemeAssignmentRepo.setSongThemes).toHaveBeenCalledWith(
        'c-1',
        song.id,
        [
          { themeSource: ThemeSource.COMMUNITY, themeId: 'theme-1' },
          { themeSource: ThemeSource.COMMUNITY, themeId: 'theme-2' },
        ],
      );
    });

    it('throws FolderNotFoundError if folder does not exist or wrong community', async () => {
      folderRepo.findById.mockResolvedValue(null);

      await expect(
        createSongUseCase.execute({
          communityId: 'c-1',
          folderId: 'f-999',
          number: '1',
          title: 'Song',
        }),
      ).rejects.toThrow(FolderNotFoundError);
    });

    it('throws FolderArchivedError if folder is archived', async () => {
      folderRepo.findById.mockResolvedValue(archivedFolder);

      await expect(
        createSongUseCase.execute({
          communityId: 'c-1',
          folderId: 'f-2',
          number: '1',
          title: 'Song',
        }),
      ).rejects.toThrow(FolderArchivedError);
    });

    it('throws FolderSongNumberConflictError if number already exists in folder', async () => {
      folderRepo.findById.mockResolvedValue(activeFolder);
      const existing = FolderSong.create(activeFolder, {
        number: '10',
        title: 'Existing Song',
      });
      folderSongRepo.findByFolderAndNumberKey.mockResolvedValue(existing);

      await expect(
        createSongUseCase.execute({
          communityId: 'c-1',
          folderId: 'f-1',
          number: '10',
          title: 'Song',
        }),
      ).rejects.toThrow(FolderSongNumberConflictError);
    });
  });

  describe('UpdateFolderSongUseCase', () => {
    it('updates song fields, renumbers, and updates themes', async () => {
      const song = FolderSong.create(activeFolder, {
        id: 's-1',
        number: '1',
        title: 'Old Title',
        isNew: true,
      });
      folderSongRepo.findById.mockResolvedValue(song);
      folderSongRepo.findByFolderAndNumberKey.mockResolvedValue(null);

      const updated = await updateSongUseCase.execute({
        communityId: 'c-1',
        folderId: 'f-1',
        songId: 's-1',
        number: '2',
        title: 'New Title',
        isNew: false,
        themeIds: ['theme-3'],
      });

      expect(updated.numberValue).toBe('2');
      expect(updated.titleValue).toBe('New Title');
      expect(updated.isNew).toBe(false);
      expect(folderSongRepo.save).toHaveBeenCalledWith(song);
      expect(songThemeAssignmentRepo.setSongThemes).toHaveBeenCalledWith(
        'c-1',
        's-1',
        [{ themeSource: ThemeSource.COMMUNITY, themeId: 'theme-3' }],
      );
    });

    it('throws FolderSongNumberConflictError when renumbering conflicts with another song', async () => {
      const song = FolderSong.create(activeFolder, {
        id: 's-1',
        number: '1',
        title: 'Song 1',
      });
      const other = FolderSong.create(activeFolder, {
        id: 's-2',
        number: '2',
        title: 'Song 2',
      });
      folderSongRepo.findById.mockResolvedValue(song);
      folderSongRepo.findByFolderAndNumberKey.mockResolvedValue(other);

      await expect(
        updateSongUseCase.execute({
          communityId: 'c-1',
          folderId: 'f-1',
          songId: 's-1',
          number: '2',
        }),
      ).rejects.toThrow(FolderSongNumberConflictError);
    });

    it('throws FolderSongNotFoundError when song not found or mismatch', async () => {
      folderSongRepo.findById.mockResolvedValue(null);

      await expect(
        updateSongUseCase.execute({
          communityId: 'c-1',
          folderId: 'f-1',
          songId: 's-99',
        }),
      ).rejects.toThrow(FolderSongNotFoundError);
    });

    it('throws FolderSongArchivedError when song is archived', async () => {
      const song = FolderSong.reconstitute({
        id: 's-1',
        communityId: 'c-1',
        folderId: 'f-1',
        number: '1',
        title: 'Song',
        archivedAt: new Date(),
      });
      folderSongRepo.findById.mockResolvedValue(song);

      await expect(
        updateSongUseCase.execute({
          communityId: 'c-1',
          folderId: 'f-1',
          songId: 's-1',
          title: 'New Title',
        }),
      ).rejects.toThrow(FolderSongArchivedError);
    });
  });

  describe('ArchiveFolderSongUseCase', () => {
    it('archives an active song', async () => {
      const song = FolderSong.create(activeFolder, {
        id: 's-1',
        number: '1',
        title: 'Song 1',
      });
      folderSongRepo.findById.mockResolvedValue(song);

      const archived = await archiveSongUseCase.execute({
        communityId: 'c-1',
        folderId: 'f-1',
        songId: 's-1',
      });

      expect(archived.isArchived).toBe(true);
      expect(folderSongRepo.save).toHaveBeenCalledWith(song);
    });

    it('throws FolderSongNotFoundError if song does not exist', async () => {
      folderSongRepo.findById.mockResolvedValue(null);

      await expect(
        archiveSongUseCase.execute({
          communityId: 'c-1',
          folderId: 'f-1',
          songId: 's-404',
        }),
      ).rejects.toThrow(FolderSongNotFoundError);
    });
  });
});
