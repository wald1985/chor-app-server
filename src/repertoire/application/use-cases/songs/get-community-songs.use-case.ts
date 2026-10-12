import { Inject, Injectable } from '@nestjs/common';
import {
  LIBRARY_READER,
  type LibraryBookRef,
  type LibraryReader,
  type LibrarySongRef,
} from '../../../../library';
import type { Folder } from '../../../domain/entities/folder.entity';
import type { FolderSong } from '../../../domain/entities/folder-song.entity';
import type { Theme } from '../../../domain/entities/theme.entity';
import {
  BOOK_ATTACHMENT_REPOSITORY,
  type BookAttachmentRepository,
} from '../../../domain/ports/book-attachment-repository.port';
import {
  FOLDER_REPOSITORY,
  type FolderRepository,
} from '../../../domain/ports/folder-repository.port';
import {
  FOLDER_SONG_REPOSITORY,
  type FolderSongRepository,
} from '../../../domain/ports/folder-song-repository.port';
import {
  SONG_THEME_ASSIGNMENT_REPOSITORY,
  type SongThemeAssignmentRepository,
} from '../../../domain/ports/song-theme-assignment-repository.port';
import {
  THEME_REPOSITORY,
  type ThemeRepository,
} from '../../../domain/ports/theme-repository.port';
import { SongNumber } from '../../../domain/value-objects/song-number';
import { ThemeSource } from '../../../domain/value-objects/theme-source';
import type {
  CommunitySongThemeView,
  CommunitySongView,
} from '../../views/repertoire.views';

export interface GetCommunitySongsQuery {
  communityId: string;
  songId?: string;
  /** Restrict to these song ids (used to resolve history in one pass). */
  songIds?: string[];
  /**
   * Also return archived songs, songs of archived folders and songs of
   * detached books, so logged songs stay resolvable (ADR 0009, Q6).
   */
  includeInactive?: boolean;
  search?: string;
  themeIds?: string[];
  containerId?: string;
}

type AssignmentMap = Map<
  string,
  Array<{ themeSource: ThemeSource; themeId: string }>
>;

@Injectable()
export class GetCommunitySongsUseCase {
  constructor(
    @Inject(BOOK_ATTACHMENT_REPOSITORY)
    private readonly bookAttachmentRepo: BookAttachmentRepository,
    @Inject(FOLDER_REPOSITORY)
    private readonly folderRepo: FolderRepository,
    @Inject(FOLDER_SONG_REPOSITORY)
    private readonly folderSongRepo: FolderSongRepository,
    @Inject(THEME_REPOSITORY)
    private readonly themeRepo: ThemeRepository,
    @Inject(SONG_THEME_ASSIGNMENT_REPOSITORY)
    private readonly songThemeAssignmentRepo: SongThemeAssignmentRepository,
    @Inject(LIBRARY_READER)
    private readonly libraryReader: LibraryReader,
  ) {}

  async execute(query: GetCommunitySongsQuery): Promise<CommunitySongView[]> {
    const includeInactive = query.includeInactive ?? false;
    const { booksMap, librarySongs } = await this.loadLibrarySongs(
      query.communityId,
      includeInactive,
    );
    const { foldersMap, folderSongs, customThemesMap, assignmentsBySong } =
      await this.loadCommunityData(query.communityId, includeInactive);

    const extraLibThemesMap = await this.loadExtraLibThemes(assignmentsBySong);

    const libViews = this.mapLibrarySongs(
      librarySongs,
      booksMap,
      assignmentsBySong,
      customThemesMap,
    );
    const folderViews = this.mapFolderSongs(
      folderSongs,
      foldersMap,
      assignmentsBySong,
      customThemesMap,
      extraLibThemesMap,
    );

    const all = [...libViews, ...folderViews];
    const filtered = this.applyFilters(all, query);
    return this.sortSongs(filtered);
  }

  private async loadLibrarySongs(
    communityId: string,
    includeInactive: boolean,
  ): Promise<{
    booksMap: Map<string, LibraryBookRef>;
    librarySongs: LibrarySongRef[];
  }> {
    const attachments = await this.bookAttachmentRepo.findAllByCommunity(
      communityId,
      { includeArchived: includeInactive },
    );
    const bookIds = attachments.map((a) => a.libraryBookId);
    if (bookIds.length === 0) {
      return { booksMap: new Map(), librarySongs: [] };
    }
    const [books, librarySongs] = await Promise.all([
      this.libraryReader.findBooks(bookIds),
      this.libraryReader.findSongsByBookIds(bookIds, {
        includeArchived: includeInactive,
      }),
    ]);
    return {
      booksMap: new Map(books.map((b) => [b.id, b])),
      librarySongs,
    };
  }

  private async loadCommunityData(
    communityId: string,
    includeInactive: boolean,
  ): Promise<{
    foldersMap: Map<string, Folder>;
    folderSongs: FolderSong[];
    customThemesMap: Map<string, Theme>;
    assignmentsBySong: AssignmentMap;
  }> {
    const [folders, folderSongs, customThemes, assignments] = await Promise.all(
      [
        this.folderRepo.findAllByCommunity(communityId, {
          includeArchived: includeInactive,
        }),
        this.folderSongRepo.findAllByCommunity(communityId, {
          includeArchived: includeInactive,
        }),
        this.themeRepo.findAllByCommunity(communityId, {
          includeArchived: false,
        }),
        this.songThemeAssignmentRepo.findByCommunityId(communityId),
      ],
    );

    const assignmentsBySong: AssignmentMap = new Map();
    for (const a of assignments) {
      const list = assignmentsBySong.get(a.songId) ?? [];
      list.push({ themeSource: a.themeSource, themeId: a.themeId });
      assignmentsBySong.set(a.songId, list);
    }

    return {
      foldersMap: new Map(folders.map((f) => [f.id, f])),
      folderSongs,
      customThemesMap: new Map(customThemes.map((t) => [t.id, t])),
      assignmentsBySong,
    };
  }

  private async loadExtraLibThemes(
    assignmentsBySong: AssignmentMap,
  ): Promise<Map<string, { id: string; name: string }>> {
    const libThemeIds: string[] = [];
    for (const list of assignmentsBySong.values()) {
      for (const item of list) {
        if (item.themeSource === ThemeSource.LIBRARY) {
          libThemeIds.push(item.themeId);
        }
      }
    }
    const uniqueIds = Array.from(new Set(libThemeIds));
    if (uniqueIds.length === 0) {
      return new Map();
    }
    const themes = await this.libraryReader.findThemes(uniqueIds);
    return new Map(themes.map((t) => [t.id, t]));
  }

  private mapLibrarySongs(
    librarySongs: LibrarySongRef[],
    booksMap: Map<string, LibraryBookRef>,
    assignmentsBySong: AssignmentMap,
    customThemesMap: Map<string, Theme>,
  ): CommunitySongView[] {
    const result: CommunitySongView[] = [];
    for (const s of librarySongs) {
      const book = booksMap.get(s.bookId);
      if (!book) continue;

      const themes: CommunitySongThemeView[] = s.themes.map((t) => ({
        source: ThemeSource.LIBRARY,
        id: t.id,
        name: t.name,
      }));

      const assigned = assignmentsBySong.get(s.id) ?? [];
      for (const a of assigned) {
        if (a.themeSource !== ThemeSource.COMMUNITY) continue;
        const t = customThemesMap.get(a.themeId);
        if (t && !themes.some((existing) => existing.id === t.id)) {
          themes.push({
            source: ThemeSource.COMMUNITY,
            id: t.id,
            name: t.nameValue,
          });
        }
      }

      result.push({
        id: s.id,
        source: ThemeSource.LIBRARY,
        container: {
          id: book.id,
          title: book.title,
          type: 'BOOK',
          seriesId: book.seriesId,
        },
        number: s.number,
        title: s.title,
        author: s.author,
        arranger: s.arranger,
        isNew: false,
        themes,
        archived: s.archived,
      });
    }
    return result;
  }

  private mapFolderSongs(
    folderSongs: FolderSong[],
    foldersMap: Map<string, Folder>,
    assignmentsBySong: AssignmentMap,
    customThemesMap: Map<string, Theme>,
    extraLibThemesMap: Map<string, { id: string; name: string }>,
  ): CommunitySongView[] {
    const result: CommunitySongView[] = [];
    for (const fs of folderSongs) {
      const folder = foldersMap.get(fs.folderId);
      if (!folder) continue;

      const themes = this.collectFolderSongThemes(
        assignmentsBySong.get(fs.id) ?? [],
        customThemesMap,
        extraLibThemesMap,
      );

      result.push({
        id: fs.id,
        source: ThemeSource.COMMUNITY,
        container: {
          id: folder.id,
          title: folder.titleValue,
          type: 'FOLDER',
          seriesId: null,
        },
        number: fs.numberValue,
        title: fs.titleValue,
        author: fs.authorValue,
        arranger: fs.arrangerValue,
        isNew: fs.isNew,
        themes,
        archived: fs.isArchived,
      });
    }
    return result;
  }

  private collectFolderSongThemes(
    assigned: Array<{ themeSource: ThemeSource; themeId: string }>,
    customThemesMap: Map<string, Theme>,
    extraLibThemesMap: Map<string, { id: string; name: string }>,
  ): CommunitySongThemeView[] {
    const themes: CommunitySongThemeView[] = [];
    for (const a of assigned) {
      if (a.themeSource === ThemeSource.COMMUNITY) {
        const t = customThemesMap.get(a.themeId);
        if (t && !themes.some((existing) => existing.id === t.id)) {
          themes.push({
            source: ThemeSource.COMMUNITY,
            id: t.id,
            name: t.nameValue,
          });
        }
      } else {
        const lt = extraLibThemesMap.get(a.themeId);
        if (lt && !themes.some((existing) => existing.id === lt.id)) {
          themes.push({
            source: ThemeSource.LIBRARY,
            id: lt.id,
            name: lt.name,
          });
        }
      }
    }
    return themes;
  }

  private applyFilters(
    songs: CommunitySongView[],
    query: GetCommunitySongsQuery,
  ): CommunitySongView[] {
    let filtered = songs;
    if (query.songId) {
      filtered = filtered.filter((s) => s.id === query.songId);
    }
    if (query.songIds) {
      const wanted = new Set(query.songIds);
      filtered = filtered.filter((s) => wanted.has(s.id));
    }
    if (query.containerId) {
      filtered = filtered.filter((s) => s.container.id === query.containerId);
    }
    if (query.search) {
      const sLower = query.search.toLowerCase().trim();
      filtered = filtered.filter(
        (s) =>
          s.title.toLowerCase().includes(sLower) ||
          s.number.toLowerCase().includes(sLower) ||
          (s.author && s.author.toLowerCase().includes(sLower)),
      );
    }
    if (query.themeIds && query.themeIds.length > 0) {
      filtered = filtered.filter((s) =>
        s.themes.some((t) => query.themeIds!.includes(t.id)),
      );
    }
    return filtered;
  }

  private sortSongs(songs: CommunitySongView[]): CommunitySongView[] {
    return songs.sort((a, b) => {
      const containerDiff = a.container.title
        .toLowerCase()
        .localeCompare(b.container.title.toLowerCase());
      if (containerDiff !== 0) {
        return containerDiff;
      }
      return this.toSortKey(a.number).localeCompare(this.toSortKey(b.number));
    });
  }

  private toSortKey(numStr: string): string {
    try {
      return new SongNumber(numStr).sortKey;
    } catch {
      return numStr.padStart(8, '0');
    }
  }
}
