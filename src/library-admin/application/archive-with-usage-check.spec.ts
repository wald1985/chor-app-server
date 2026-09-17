import { LibraryItemInUseError } from '../../library';
import { ArchiveWithUsageCheck } from './archive-with-usage-check';
import type {
  LibraryItemUsage,
  LibraryUsageItemRef,
  LibraryUsageProvider,
} from './ports/library-usage-provider.port';

class MockUsageProvider implements LibraryUsageProvider {
  constructor(
    public usageResult: { communities: number; references: number } = {
      communities: 0,
      references: 0,
    },
  ) {}

  countUsage(refs: LibraryUsageItemRef[]): Promise<LibraryItemUsage[]> {
    return Promise.resolve(
      refs.map((ref) => ({
        ref,
        communities: this.usageResult.communities,
        references: this.usageResult.references,
      })),
    );
  }
}

describe('ArchiveWithUsageCheck (Unit)', () => {
  let usageProvider: MockUsageProvider;
  let mockArchiveBookUseCase: { execute: jest.Mock };
  let mockArchiveSongUseCase: { execute: jest.Mock };
  let mockArchiveThemeUseCase: { execute: jest.Mock };
  let archiveWithUsageCheck: ArchiveWithUsageCheck;

  beforeEach(() => {
    usageProvider = new MockUsageProvider();
    mockArchiveBookUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };
    mockArchiveSongUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };
    mockArchiveThemeUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    archiveWithUsageCheck = new ArchiveWithUsageCheck(
      usageProvider,
      mockArchiveBookUseCase as any,
      mockArchiveSongUseCase as any,
      mockArchiveThemeUseCase as any,
    );
  });

  describe('when item is not in use (0 communities, 0 references)', () => {
    beforeEach(() => {
      usageProvider.usageResult = { communities: 0, references: 0 };
    });

    it('archives book without needing confirmation', async () => {
      await archiveWithUsageCheck.archiveBook('b1');

      expect(mockArchiveBookUseCase.execute).toHaveBeenCalledWith({ id: 'b1' });
    });

    it('archives song without needing confirmation', async () => {
      await archiveWithUsageCheck.archiveSong('s1');

      expect(mockArchiveSongUseCase.execute).toHaveBeenCalledWith({ id: 's1' });
    });

    it('archives theme without needing confirmation', async () => {
      await archiveWithUsageCheck.archiveTheme('t1');

      expect(mockArchiveThemeUseCase.execute).toHaveBeenCalledWith({
        id: 't1',
      });
    });
  });

  describe('when item is in use (communities: 3, references: 0)', () => {
    beforeEach(() => {
      usageProvider.usageResult = { communities: 3, references: 0 };
    });

    it('throws LibraryItemInUseError for book when not confirmed', async () => {
      await expect(
        archiveWithUsageCheck.archiveBook('b1', false),
      ).rejects.toThrow(LibraryItemInUseError);
      expect(mockArchiveBookUseCase.execute).not.toHaveBeenCalled();
    });

    it('archives book when confirmInUse is true', async () => {
      await archiveWithUsageCheck.archiveBook('b1', true);

      expect(mockArchiveBookUseCase.execute).toHaveBeenCalledWith({ id: 'b1' });
    });

    it('throws LibraryItemInUseError for song when not confirmed', async () => {
      await expect(
        archiveWithUsageCheck.archiveSong('s1', false),
      ).rejects.toThrow(LibraryItemInUseError);
      expect(mockArchiveSongUseCase.execute).not.toHaveBeenCalled();
    });

    it('archives song when confirmInUse is true', async () => {
      await archiveWithUsageCheck.archiveSong('s1', true);

      expect(mockArchiveSongUseCase.execute).toHaveBeenCalledWith({ id: 's1' });
    });

    it('throws LibraryItemInUseError for theme when not confirmed', async () => {
      await expect(
        archiveWithUsageCheck.archiveTheme('t1', false),
      ).rejects.toThrow(LibraryItemInUseError);
      expect(mockArchiveThemeUseCase.execute).not.toHaveBeenCalled();
    });

    it('archives theme when confirmInUse is true', async () => {
      await archiveWithUsageCheck.archiveTheme('t1', true);

      expect(mockArchiveThemeUseCase.execute).toHaveBeenCalledWith({
        id: 't1',
      });
    });
  });
});
