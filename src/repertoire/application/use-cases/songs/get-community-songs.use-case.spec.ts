import { BookAttachment } from '../../../domain/entities/book-attachment.entity';
import { Folder } from '../../../domain/entities/folder.entity';
import { FolderSong } from '../../../domain/entities/folder-song.entity';
import { SongThemeAssignment } from '../../../domain/entities/song-theme-assignment.entity';
import { Theme } from '../../../domain/entities/theme.entity';
import { ThemeSource } from '../../../domain/value-objects/theme-source';
import { GetCommunitySongsUseCase } from './get-community-songs.use-case';

describe('GetCommunitySongsUseCase', () => {
  let bookAttachmentRepo: {
    findById: jest.Mock;
    findByCommunityAndLibraryBookId: jest.Mock;
    findAllByCommunity: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
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
  let libraryReader: {
    findBooks: jest.Mock;
    findSongsByBookIds: jest.Mock;
    findSongs: jest.Mock;
    lookupSong: jest.Mock;
    findThemes: jest.Mock;
    listThemes: jest.Mock;
  };
  let getCommunitySongsUseCase: GetCommunitySongsUseCase;

  beforeEach(() => {
    bookAttachmentRepo = {
      findById: jest.fn(),
      findByCommunityAndLibraryBookId: jest.fn(),
      findAllByCommunity: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
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
    libraryReader = {
      findBooks: jest.fn(),
      findSongsByBookIds: jest.fn(),
      findSongs: jest.fn(),
      lookupSong: jest.fn(),
      findThemes: jest.fn(),
      listThemes: jest.fn(),
    };

    getCommunitySongsUseCase = new GetCommunitySongsUseCase(
      bookAttachmentRepo,
      folderRepo,
      folderSongRepo,
      themeRepo,
      songThemeAssignmentRepo,
      libraryReader,
    );
  });

  it('correctly glues library songs and folder songs with themes and sorting', async () => {
    // 1. Attached books
    bookAttachmentRepo.findAllByCommunity.mockResolvedValue([
      BookAttachment.reconstitute({
        id: 'att-1',
        communityId: 'c-1',
        libraryBookId: 'book-1',
      }),
    ]);

    libraryReader.findBooks.mockResolvedValue([
      {
        id: 'book-1',
        title: 'Chorbuch A',
        seriesId: null,
        volume: 1,
        archived: false,
      },
    ]);

    // Library song in book-1
    libraryReader.findSongsByBookIds.mockResolvedValue([
      {
        id: 'lib-song-1',
        bookId: 'book-1',
        seriesId: null,
        volume: 1,
        number: '10',
        title: 'Lobet den Herrn',
        author: 'J.S. Bach',
        arranger: null,
        themes: [
          {
            id: 'lib-th-1',
            name: 'Lob & Dank',
            nameKey: 'lob & dank',
            archived: false,
          },
        ],
        archived: false,
      },
    ]);

    // 2. Custom Folders & Songs
    const folder = Folder.reconstitute({
      id: 'f-1',
      communityId: 'c-1',
      title: 'Mappe 2026',
      archivedAt: null,
    });
    folderRepo.findAllByCommunity.mockResolvedValue([folder]);

    const folderSong = FolderSong.create(folder, {
      id: 'folder-song-1',
      number: '5',
      title: 'Grosser Gott wir loben dich',
      author: null,
      arranger: null,
      isNew: true,
    });
    folderSongRepo.findAllByCommunity.mockResolvedValue([folderSong]);

    // 3. Custom themes in Community
    const customTheme = Theme.reconstitute({
      id: 'custom-th-1',
      communityId: 'c-1',
      name: 'Festlich',
      archivedAt: null,
    });
    themeRepo.findAllByCommunity.mockResolvedValue([customTheme]);

    // 4. Assignments:
    // - assign customTheme ('custom-th-1') to lib-song-1
    // - assign library theme ('lib-th-extra') to folder-song-1
    songThemeAssignmentRepo.findByCommunityId.mockResolvedValue([
      SongThemeAssignment.create({
        communityId: 'c-1',
        songId: 'lib-song-1',
        themeSource: ThemeSource.COMMUNITY,
        themeId: 'custom-th-1',
      }),
      SongThemeAssignment.create({
        communityId: 'c-1',
        songId: 'folder-song-1',
        themeSource: ThemeSource.LIBRARY,
        themeId: 'lib-th-extra',
      }),
    ]);

    libraryReader.findThemes.mockResolvedValue([
      {
        id: 'lib-th-extra',
        name: 'Weihnachten',
        nameKey: 'weihnachten',
        archived: false,
      },
    ]);

    // Execute
    const songs = await getCommunitySongsUseCase.execute({
      communityId: 'c-1',
    });

    expect(songs).toHaveLength(2);

    // Sorted by container title ('Chorbuch A' before 'Mappe 2026')
    const [first, second] = songs;

    // First song: Library song
    expect(first.id).toBe('lib-song-1');
    expect(first.source).toBe(ThemeSource.LIBRARY);
    expect(first.container.title).toBe('Chorbuch A');
    expect(first.container.type).toBe('BOOK');
    expect(first.number).toBe('10');
    expect(first.isNew).toBe(false);
    // Effective themes: original library theme + assigned community theme
    expect(first.themes).toEqual([
      { source: ThemeSource.LIBRARY, id: 'lib-th-1', name: 'Lob & Dank' },
      { source: ThemeSource.COMMUNITY, id: 'custom-th-1', name: 'Festlich' },
    ]);

    // Second song: Folder song
    expect(second.id).toBe('folder-song-1');
    expect(second.source).toBe(ThemeSource.COMMUNITY);
    expect(second.container.title).toBe('Mappe 2026');
    expect(second.container.type).toBe('FOLDER');
    expect(second.number).toBe('5');
    expect(second.isNew).toBe(true);
    // Assigned library theme on a folder song
    expect(second.themes).toEqual([
      { source: ThemeSource.LIBRARY, id: 'lib-th-extra', name: 'Weihnachten' },
    ]);
  });

  it('filters by search, containerId, and themeIds', async () => {
    bookAttachmentRepo.findAllByCommunity.mockResolvedValue([]);
    const folder = Folder.reconstitute({
      id: 'f-1',
      communityId: 'c-1',
      title: 'Mappe',
      archivedAt: null,
    });
    folderRepo.findAllByCommunity.mockResolvedValue([folder]);
    const song1 = FolderSong.create(folder, {
      id: 's-1',
      number: '1',
      title: 'Gloria',
      author: 'Mozart',
    });
    const song2 = FolderSong.create(folder, {
      id: 's-2',
      number: '2',
      title: 'Sanctus',
      author: 'Schubert',
    });
    folderSongRepo.findAllByCommunity.mockResolvedValue([song1, song2]);
    themeRepo.findAllByCommunity.mockResolvedValue([]);
    songThemeAssignmentRepo.findByCommunityId.mockResolvedValue([]);

    const searchRes = await getCommunitySongsUseCase.execute({
      communityId: 'c-1',
      search: 'mozart',
    });
    expect(searchRes).toHaveLength(1);
    expect(searchRes[0].id).toBe('s-1');

    const containerRes = await getCommunitySongsUseCase.execute({
      communityId: 'c-1',
      containerId: 'non-existent',
    });
    expect(containerRes).toHaveLength(0);
  });
});
