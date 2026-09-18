import { Inject, Injectable } from '@nestjs/common';
import { LIBRARY_READER, type LibraryReader } from '../../../../library';
import {
  BOOK_ATTACHMENT_REPOSITORY,
  type BookAttachmentRepository,
} from '../../../domain/ports/book-attachment-repository.port';
import {
  THEME_REPOSITORY,
  type ThemeRepository,
} from '../../../domain/ports/theme-repository.port';
import { ThemeSource } from '../../../domain/value-objects/theme-source';
import type { CommunityThemeView } from '../../views/repertoire.views';

export interface GetCommunityThemesQuery {
  communityId: string;
  includeArchived?: boolean;
}

@Injectable()
export class GetCommunityThemesUseCase {
  constructor(
    @Inject(THEME_REPOSITORY)
    private readonly themeRepo: ThemeRepository,
    @Inject(BOOK_ATTACHMENT_REPOSITORY)
    private readonly bookAttachmentRepo: BookAttachmentRepository,
    @Inject(LIBRARY_READER)
    private readonly libraryReader: LibraryReader,
  ) {}

  async execute(query: GetCommunityThemesQuery): Promise<CommunityThemeView[]> {
    const communityThemes = await this.themeRepo.findAllByCommunity(
      query.communityId,
      { includeArchived: query.includeArchived },
    );

    const attachments = await this.bookAttachmentRepo.findAllByCommunity(
      query.communityId,
    );
    const activeBookIds = attachments
      .filter((a) => !a.isArchived)
      .map((a) => a.libraryBookId);

    const libraryThemes = await this.collectLibraryThemes(activeBookIds);

    const views: CommunityThemeView[] = [
      ...libraryThemes,
      ...communityThemes.map((t) => ({
        id: t.id,
        name: t.nameValue,
        source: ThemeSource.COMMUNITY,
        archived: t.isArchived,
      })),
    ];

    return views.sort((a, b) => a.name.localeCompare(b.name));
  }

  private async collectLibraryThemes(
    bookIds: string[],
  ): Promise<CommunityThemeView[]> {
    if (bookIds.length === 0) {
      return [];
    }

    const songs = await this.libraryReader.findSongsByBookIds(bookIds, {
      includeArchived: false,
    });

    const themesMap = new Map<string, CommunityThemeView>();
    for (const song of songs) {
      this.populateSongThemes(song.themes, themesMap);
    }

    return Array.from(themesMap.values());
  }

  private populateSongThemes(
    themes: Array<{ id: string; name: string; archived: boolean }>,
    themesMap: Map<string, CommunityThemeView>,
  ): void {
    for (const theme of themes) {
      if (!theme.archived && !themesMap.has(theme.id)) {
        themesMap.set(theme.id, {
          id: theme.id,
          name: theme.name,
          source: ThemeSource.LIBRARY,
          archived: theme.archived,
        });
      }
    }
  }
}
