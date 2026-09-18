import { Theme } from '../../../domain/entities/theme.entity';
import { ThemeNameConflictError } from '../../../domain/errors/repertoire.errors';
import { ThemeSource } from '../../../domain/value-objects/theme-source';
import { CreateThemeUseCase } from './create-theme.use-case';
import { GetCommunityThemesUseCase } from './get-community-themes.use-case';
import { SetSongThemesUseCase } from './set-song-themes.use-case';

describe('Theme Use Cases', () => {
  let themeRepo: {
    findById: jest.Mock;
    findByIds: jest.Mock;
    findByCommunityAndNameKey: jest.Mock;
    findAllByCommunity: jest.Mock;
    save: jest.Mock;
  };
  let songThemeAssignmentRepo: {
    findByCommunityId: jest.Mock;
    findByCommunityAndSongId: jest.Mock;
    findByCommunityAndSongIds: jest.Mock;
    setSongThemes: jest.Mock;
  };
  let createThemeUseCase: CreateThemeUseCase;
  let setSongThemesUseCase: SetSongThemesUseCase;

  beforeEach(() => {
    themeRepo = {
      findById: jest.fn(),
      findByIds: jest.fn(),
      findByCommunityAndNameKey: jest.fn(),
      findAllByCommunity: jest.fn(),
      save: jest.fn(),
    };
    songThemeAssignmentRepo = {
      findByCommunityId: jest.fn(),
      findByCommunityAndSongId: jest.fn(),
      findByCommunityAndSongIds: jest.fn(),
      setSongThemes: jest.fn(),
    };

    createThemeUseCase = new CreateThemeUseCase(themeRepo);
    setSongThemesUseCase = new SetSongThemesUseCase(songThemeAssignmentRepo);
  });

  describe('CreateThemeUseCase', () => {
    it('creates and saves a new community theme', async () => {
      themeRepo.findByCommunityAndNameKey.mockResolvedValue(null);

      const theme = await createThemeUseCase.execute({
        communityId: 'c-1',
        name: 'Gospel',
      });

      expect(theme.communityId).toBe('c-1');
      expect(theme.nameValue).toBe('Gospel');
      expect(themeRepo.save).toHaveBeenCalledWith(theme);
    });

    it('throws ThemeNameConflictError if theme already exists in community', async () => {
      const existing = Theme.create({
        communityId: 'c-1',
        name: 'Gospel',
      });
      themeRepo.findByCommunityAndNameKey.mockResolvedValue(existing);

      await expect(
        createThemeUseCase.execute({
          communityId: 'c-1',
          name: 'gospel',
        }),
      ).rejects.toThrow(ThemeNameConflictError);
    });
  });

  describe('SetSongThemesUseCase', () => {
    it('saves song themes', async () => {
      await setSongThemesUseCase.execute({
        communityId: 'c-1',
        songId: 's-1',
        themeAssignments: [
          { themeSource: ThemeSource.COMMUNITY, themeId: 't-1' },
          { themeSource: ThemeSource.LIBRARY, themeId: 'lt-1' },
        ],
      });

      expect(songThemeAssignmentRepo.setSongThemes).toHaveBeenCalledWith(
        'c-1',
        's-1',
        [
          { themeSource: ThemeSource.COMMUNITY, themeId: 't-1' },
          { themeSource: ThemeSource.LIBRARY, themeId: 'lt-1' },
        ],
      );
    });
  });

  describe('GetCommunityThemesUseCase', () => {
    it('returns combined community themes and attached library themes sorted by name', async () => {
      const bookAttachmentRepo = {
        findById: jest.fn(),
        findByCommunityAndLibraryBookId: jest.fn(),
        findAllByCommunity: jest.fn(),
        save: jest.fn(),
        delete: jest.fn(),
      };
      const libraryReader = {
        findBooks: jest.fn(),
        findSongsByBookIds: jest.fn(),
        findSongs: jest.fn(),
        lookupSong: jest.fn(),
        findThemes: jest.fn(),
        listThemes: jest.fn(),
      };
      const getCommunityThemesUseCase = new GetCommunityThemesUseCase(
        themeRepo,
        bookAttachmentRepo,
        libraryReader,
      );

      themeRepo.findAllByCommunity.mockResolvedValue([
        Theme.create({
          id: 'ct-1',
          communityId: 'c-1',
          name: 'Zion Songs',
        }),
      ]);

      bookAttachmentRepo.findAllByCommunity.mockResolvedValue([
        {
          libraryBookId: 'lb-1',
          isArchived: false,
        },
      ]);

      libraryReader.findSongsByBookIds.mockResolvedValue([
        {
          id: 'ls-1',
          themes: [
            { id: 'lt-1', name: 'Advent', archived: false },
            { id: 'lt-2', name: 'Zion Songs', archived: false },
          ],
        },
      ]);

      const result = await getCommunityThemesUseCase.execute({
        communityId: 'c-1',
      });

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        id: 'lt-1',
        name: 'Advent',
        source: ThemeSource.LIBRARY,
        archived: false,
      });
      expect(result[1]).toEqual({
        id: 'lt-2',
        name: 'Zion Songs',
        source: ThemeSource.LIBRARY,
        archived: false,
      });
      expect(result[2]).toEqual({
        id: 'ct-1',
        name: 'Zion Songs',
        source: ThemeSource.COMMUNITY,
        archived: false,
      });
    });
  });
});
