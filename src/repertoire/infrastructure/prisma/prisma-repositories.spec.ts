import { BookAttachment } from '../../domain/entities/book-attachment.entity';
import { Folder } from '../../domain/entities/folder.entity';
import { FolderSong } from '../../domain/entities/folder-song.entity';
import { Theme } from '../../domain/entities/theme.entity';
import {
  AttachmentAlreadyExistsError,
  FolderSongNumberConflictError,
  FolderTitleConflictError,
  ThemeNameConflictError,
} from '../../domain/errors/repertoire.errors';
import { ThemeSource } from '../../domain/value-objects/theme-source';
import { PrismaBookAttachmentRepository } from './prisma-book-attachment.repository';
import { PrismaFolderRepository } from './prisma-folder.repository';
import { PrismaFolderSongRepository } from './prisma-folder-song.repository';
import { PrismaSongThemeAssignmentRepository } from './prisma-song-theme-assignment.repository';
import { PrismaThemeRepository } from './prisma-theme.repository';

describe('Repertoire Prisma Repositories', () => {
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      folder: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      folderSong: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      bookAttachment: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn(),
      },
      theme: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      songThemeAssignment: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: jest.fn((cb: any) => cb(mockPrisma)),
    };
  });

  describe('PrismaFolderRepository', () => {
    let repo: PrismaFolderRepository;

    beforeEach(() => {
      repo = new PrismaFolderRepository(mockPrisma);
    });

    it('finds by id', async () => {
      mockPrisma.folder.findUnique.mockResolvedValue({
        id: 'f-1',
        communityId: 'c-1',
        title: 'Mappe',
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await repo.findById('f-1');
      expect(res).not.toBeNull();
      expect(res?.id).toBe('f-1');
      expect(res?.titleValue).toBe('Mappe');
    });

    it('finds by community and titleKey', async () => {
      mockPrisma.folder.findUnique.mockResolvedValue({
        id: 'f-1',
        communityId: 'c-1',
        title: 'Mappe',
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await repo.findByCommunityAndTitleKey('c-1', 'mappe');
      expect(res).not.toBeNull();
      expect(res?.titleKey).toBe('mappe');
    });

    it('finds all by community with and without archived', async () => {
      mockPrisma.folder.findMany.mockResolvedValue([]);
      await repo.findAllByCommunity('c-1');
      expect(mockPrisma.folder.findMany).toHaveBeenCalledWith({
        where: { communityId: 'c-1', archivedAt: null },
        orderBy: { title: 'asc' },
      });

      await repo.findAllByCommunity('c-1', { includeArchived: true });
      expect(mockPrisma.folder.findMany).toHaveBeenCalledWith({
        where: { communityId: 'c-1' },
        orderBy: { title: 'asc' },
      });
    });

    it('saves folder and throws FolderTitleConflictError on P2002', async () => {
      const folder = Folder.create({
        id: 'f-1',
        communityId: 'c-1',
        title: 'Mappe',
      });
      mockPrisma.folder.upsert.mockResolvedValue({});

      await repo.save(folder);
      expect(mockPrisma.folder.upsert).toHaveBeenCalled();

      mockPrisma.folder.upsert.mockRejectedValue({ code: 'P2002' });
      await expect(repo.save(folder)).rejects.toThrow(FolderTitleConflictError);
    });
  });

  describe('PrismaFolderSongRepository', () => {
    let repo: PrismaFolderSongRepository;

    beforeEach(() => {
      repo = new PrismaFolderSongRepository(mockPrisma);
    });

    it('finds by id and by numberKey', async () => {
      mockPrisma.folderSong.findUnique.mockResolvedValue({
        id: 's-1',
        communityId: 'c-1',
        folderId: 'f-1',
        number: '12',
        title: 'Song',
        author: null,
        arranger: null,
        isNew: false,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res1 = await repo.findById('s-1');
      expect(res1?.id).toBe('s-1');

      const res2 = await repo.findByFolderAndNumberKey('f-1', '12');
      expect(res2?.numberValue).toBe('12');
    });

    it('finds all by folder and all by community', async () => {
      mockPrisma.folderSong.findMany.mockResolvedValue([]);
      await repo.findAllByFolder('f-1');
      expect(mockPrisma.folderSong.findMany).toHaveBeenCalledWith({
        where: { folderId: 'f-1', archivedAt: null },
        orderBy: { sortKey: 'asc' },
      });

      await repo.findAllByCommunity('c-1');
      expect(mockPrisma.folderSong.findMany).toHaveBeenCalledWith({
        where: { communityId: 'c-1', archivedAt: null },
        orderBy: [{ folderId: 'asc' }, { sortKey: 'asc' }],
      });
    });

    it('saves and throws FolderSongNumberConflictError on P2002', async () => {
      const folder = Folder.reconstitute({
        id: 'f-1',
        communityId: 'c-1',
        title: 'Mappe',
        archivedAt: null,
      });
      const song = FolderSong.create(folder, {
        id: 's-1',
        number: '1',
        title: 'Song',
      });

      mockPrisma.folderSong.upsert.mockResolvedValue({});
      await repo.save(song);
      expect(mockPrisma.folderSong.upsert).toHaveBeenCalled();

      mockPrisma.folderSong.upsert.mockRejectedValue({ code: 'P2002' });
      await expect(repo.save(song)).rejects.toThrow(
        FolderSongNumberConflictError,
      );
    });
  });

  describe('PrismaBookAttachmentRepository', () => {
    let repo: PrismaBookAttachmentRepository;

    beforeEach(() => {
      repo = new PrismaBookAttachmentRepository(mockPrisma);
    });

    it('finds by id, libraryBookId, community, and handles deletion', async () => {
      mockPrisma.bookAttachment.findUnique.mockResolvedValue({
        id: 'a-1',
        communityId: 'c-1',
        libraryBookId: 'b-1',
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await repo.findById('a-1');
      expect(res?.libraryBookId).toBe('b-1');

      const byBook = await repo.findByCommunityAndLibraryBookId('c-1', 'b-1');
      expect(byBook?.id).toBe('a-1');

      mockPrisma.bookAttachment.findMany.mockResolvedValue([]);
      await repo.findAllByCommunity('c-1');
      expect(mockPrisma.bookAttachment.findMany).toHaveBeenCalled();

      await repo.delete('a-1');
      expect(mockPrisma.bookAttachment.delete).toHaveBeenCalledWith({
        where: { id: 'a-1' },
      });
    });

    it('saves and handles P2002', async () => {
      const att = BookAttachment.create({
        id: 'a-1',
        communityId: 'c-1',
        libraryBookId: 'b-1',
      });
      mockPrisma.bookAttachment.upsert.mockResolvedValue({});
      await repo.save(att);

      mockPrisma.bookAttachment.upsert.mockRejectedValue({ code: 'P2002' });
      await expect(repo.save(att)).rejects.toThrow(
        AttachmentAlreadyExistsError,
      );
    });
  });

  describe('PrismaThemeRepository', () => {
    let repo: PrismaThemeRepository;

    beforeEach(() => {
      repo = new PrismaThemeRepository(mockPrisma);
    });

    it('finds by id, ids, nameKey, community', async () => {
      mockPrisma.theme.findUnique.mockResolvedValue({
        id: 't-1',
        communityId: 'c-1',
        name: 'Praise',
        nameKey: 'praise',
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await repo.findById('t-1');
      expect(res?.nameValue).toBe('Praise');

      mockPrisma.theme.findMany.mockResolvedValue([]);
      await repo.findByIds(['t-1', 't-2']);
      expect(mockPrisma.theme.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['t-1', 't-2'] } },
      });

      const byKey = await repo.findByCommunityAndNameKey('c-1', 'praise');
      expect(byKey?.nameKey).toBe('praise');
    });

    it('saves and throws ThemeNameConflictError on P2002', async () => {
      const theme = Theme.create({
        id: 't-1',
        communityId: 'c-1',
        name: 'Praise',
      });
      mockPrisma.theme.upsert.mockResolvedValue({});
      await repo.save(theme);

      mockPrisma.theme.upsert.mockRejectedValue({ code: 'P2002' });
      await expect(repo.save(theme)).rejects.toThrow(ThemeNameConflictError);
    });
  });

  describe('PrismaSongThemeAssignmentRepository', () => {
    let repo: PrismaSongThemeAssignmentRepository;

    beforeEach(() => {
      repo = new PrismaSongThemeAssignmentRepository(mockPrisma);
    });

    it('finds by community and songs', async () => {
      mockPrisma.songThemeAssignment.findMany.mockResolvedValue([
        {
          communityId: 'c-1',
          songId: 's-1',
          themeSource: 'LIBRARY',
          themeId: 't-1',
          createdAt: new Date(),
        },
      ]);

      const res1 = await repo.findByCommunityId('c-1');
      expect(res1).toHaveLength(1);
      expect(res1[0].themeSource).toBe(ThemeSource.LIBRARY);

      const res2 = await repo.findByCommunityAndSongId('c-1', 's-1');
      expect(res2).toHaveLength(1);

      const res3 = await repo.findByCommunityAndSongIds('c-1', ['s-1']);
      expect(res3).toHaveLength(1);
    });

    it('sets song themes transactionally', async () => {
      await repo.setSongThemes('c-1', 's-1', [
        { themeSource: ThemeSource.COMMUNITY, themeId: 't-custom-1' },
      ]);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.songThemeAssignment.deleteMany).toHaveBeenCalledWith({
        where: { communityId: 'c-1', songId: 's-1' },
      });
      expect(mockPrisma.songThemeAssignment.createMany).toHaveBeenCalledWith({
        data: [
          {
            communityId: 'c-1',
            songId: 's-1',
            themeSource: ThemeSource.COMMUNITY,
            themeId: 't-custom-1',
          },
        ],
      });
    });
  });
});
