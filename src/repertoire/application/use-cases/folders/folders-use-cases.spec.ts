import { Folder } from '../../../domain/entities/folder.entity';
import {
  FolderNotFoundError,
  FolderTitleConflictError,
} from '../../../domain/errors/repertoire.errors';
import { ArchiveFolderUseCase } from './archive-folder.use-case';
import { CreateFolderUseCase } from './create-folder.use-case';
import { ListFoldersUseCase } from './list-folders.use-case';
import { RenameFolderUseCase } from './rename-folder.use-case';

describe('Folder Use Cases', () => {
  let folderRepo: {
    findById: jest.Mock;
    findByCommunityAndTitleKey: jest.Mock;
    findAllByCommunity: jest.Mock;
    save: jest.Mock;
  };
  let createFolderUseCase: CreateFolderUseCase;
  let renameFolderUseCase: RenameFolderUseCase;
  let archiveFolderUseCase: ArchiveFolderUseCase;
  let listFoldersUseCase: ListFoldersUseCase;

  beforeEach(() => {
    folderRepo = {
      findById: jest.fn(),
      findByCommunityAndTitleKey: jest.fn(),
      findAllByCommunity: jest.fn(),
      save: jest.fn(),
    };
    createFolderUseCase = new CreateFolderUseCase(folderRepo);
    renameFolderUseCase = new RenameFolderUseCase(folderRepo);
    archiveFolderUseCase = new ArchiveFolderUseCase(folderRepo);
    listFoldersUseCase = new ListFoldersUseCase(folderRepo);
  });

  describe('CreateFolderUseCase', () => {
    it('creates and saves a new folder', async () => {
      folderRepo.findByCommunityAndTitleKey.mockResolvedValue(null);

      const folder = await createFolderUseCase.execute({
        communityId: 'c-1',
        title: 'Mappe',
      });

      expect(folder.communityId).toBe('c-1');
      expect(folder.titleValue).toBe('Mappe');
      expect(folderRepo.save).toHaveBeenCalledWith(folder);
    });

    it('throws FolderTitleConflictError if title already exists in community', async () => {
      const existing = Folder.create({
        communityId: 'c-1',
        title: 'Mappe',
      });
      folderRepo.findByCommunityAndTitleKey.mockResolvedValue(existing);

      await expect(
        createFolderUseCase.execute({
          communityId: 'c-1',
          title: 'mappe',
        }),
      ).rejects.toThrow(FolderTitleConflictError);
    });
  });

  describe('RenameFolderUseCase', () => {
    it('renames an existing folder', async () => {
      const folder = Folder.reconstitute({
        id: 'f-1',
        communityId: 'c-1',
        title: 'Old Title',
        archivedAt: null,
      });
      folderRepo.findById.mockResolvedValue(folder);
      folderRepo.findByCommunityAndTitleKey.mockResolvedValue(null);

      const updated = await renameFolderUseCase.execute({
        communityId: 'c-1',
        folderId: 'f-1',
        title: 'New Title',
      });

      expect(updated.titleValue).toBe('New Title');
      expect(folderRepo.save).toHaveBeenCalledWith(folder);
    });

    it('throws FolderNotFoundError if folder is not found or belongs to another community', async () => {
      folderRepo.findById.mockResolvedValue(null);

      await expect(
        renameFolderUseCase.execute({
          communityId: 'c-1',
          folderId: 'f-999',
          title: 'New Title',
        }),
      ).rejects.toThrow(FolderNotFoundError);
    });

    it('throws FolderTitleConflictError if new title conflicts with another folder', async () => {
      const folder = Folder.reconstitute({
        id: 'f-1',
        communityId: 'c-1',
        title: 'Folder 1',
        archivedAt: null,
      });
      const otherFolder = Folder.reconstitute({
        id: 'f-2',
        communityId: 'c-1',
        title: 'Folder 2',
        archivedAt: null,
      });
      folderRepo.findById.mockResolvedValue(folder);
      folderRepo.findByCommunityAndTitleKey.mockResolvedValue(otherFolder);

      await expect(
        renameFolderUseCase.execute({
          communityId: 'c-1',
          folderId: 'f-1',
          title: 'Folder 2',
        }),
      ).rejects.toThrow(FolderTitleConflictError);
    });
  });

  describe('ArchiveFolderUseCase', () => {
    it('archives folder', async () => {
      const folder = Folder.reconstitute({
        id: 'f-1',
        communityId: 'c-1',
        title: 'Folder 1',
        archivedAt: null,
      });
      folderRepo.findById.mockResolvedValue(folder);

      const archived = await archiveFolderUseCase.execute({
        communityId: 'c-1',
        folderId: 'f-1',
      });

      expect(archived.isArchived).toBe(true);
      expect(folderRepo.save).toHaveBeenCalledWith(folder);
    });
  });

  describe('ListFoldersUseCase', () => {
    it('returns folders for community', async () => {
      folderRepo.findAllByCommunity.mockResolvedValue([]);
      const res = await listFoldersUseCase.execute({
        communityId: 'c-1',
        includeArchived: true,
      });
      expect(res).toEqual([]);
      expect(folderRepo.findAllByCommunity).toHaveBeenCalledWith('c-1', {
        includeArchived: true,
      });
    });
  });
});
