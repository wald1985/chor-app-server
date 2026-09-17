import { Inject, Injectable } from '@nestjs/common';
import { SONG_REPOSITORY } from '../../domain/ports/song-repository.port';
import type { SongRepository } from '../../domain/ports/song-repository.port';
import { THEME_REPOSITORY } from '../../domain/ports/theme-repository.port';
import type { ThemeRepository } from '../../domain/ports/theme-repository.port';
import type { ThemeView } from '../views/library.views';
import { toThemeView } from '../views/view-mappers';

@Injectable()
export class ListThemesQuery {
  constructor(
    @Inject(THEME_REPOSITORY)
    private readonly themeRepo: ThemeRepository,
    @Inject(SONG_REPOSITORY)
    private readonly songRepo: SongRepository,
  ) {}

  async execute(options?: { includeArchived?: boolean }): Promise<ThemeView[]> {
    const themes = await this.themeRepo.findAll(options);
    const countMap = await this.songRepo.countActiveSongsByTheme();

    const views = themes.map((theme) => {
      const count = countMap.get(theme.id) ?? 0;
      return toThemeView(theme, count);
    });

    return views.sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }
}
