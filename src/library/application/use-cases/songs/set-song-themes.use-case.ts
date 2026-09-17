import { Inject, Injectable } from '@nestjs/common';
import {
  SongArchivedError,
  SongNotFoundError,
  ThemeArchivedError,
  ThemeNotFoundError,
} from '../../../domain/errors/library.errors';
import {
  LIBRARY_UNIT_OF_WORK,
  LibraryUnitOfWork,
} from '../../../domain/ports/library-unit-of-work.port';
import {
  SONG_REPOSITORY,
  SongRepository,
} from '../../../domain/ports/song-repository.port';
import {
  THEME_REPOSITORY,
  ThemeRepository,
} from '../../../domain/ports/theme-repository.port';

export interface SetSongThemesCommand {
  songId: string;
  themeIds: string[];
}

@Injectable()
export class SetSongThemesUseCase {
  constructor(
    @Inject(SONG_REPOSITORY)
    private readonly songRepo: SongRepository,
    @Inject(THEME_REPOSITORY)
    private readonly themeRepo: ThemeRepository,
    @Inject(LIBRARY_UNIT_OF_WORK)
    private readonly uow: LibraryUnitOfWork,
  ) {}

  async execute(command: SetSongThemesCommand): Promise<void> {
    await this.uow.run(async () => {
      const song = await this.songRepo.findById(command.songId);
      if (!song) {
        throw new SongNotFoundError(command.songId);
      }
      if (song.isArchived) {
        throw new SongArchivedError(command.songId);
      }

      const targetThemeIds = Array.from(new Set(command.themeIds));
      await this.validateThemes(targetThemeIds, song.themeIds);

      if (this.areThemesUnchanged(song.themeIds, targetThemeIds)) {
        return;
      }

      song.setThemes(targetThemeIds);
      await this.songRepo.save(song);
    });
  }

  private async validateThemes(
    targetThemeIds: string[],
    currentThemeIds: string[],
  ): Promise<void> {
    if (targetThemeIds.length === 0) {
      return;
    }
    const existingThemes = await this.themeRepo.findByIds(targetThemeIds);
    if (existingThemes.length !== targetThemeIds.length) {
      const found = new Set(existingThemes.map((t) => t.id));
      const missing = targetThemeIds.find((id) => !found.has(id));
      throw new ThemeNotFoundError(missing!);
    }
    const currentSet = new Set(currentThemeIds);
    for (const theme of existingThemes) {
      if (theme.isArchived && !currentSet.has(theme.id)) {
        throw new ThemeArchivedError(theme.id);
      }
    }
  }

  private areThemesUnchanged(current: string[], target: string[]): boolean {
    if (current.length !== target.length) {
      return false;
    }
    const set = new Set(current);
    return target.every((id) => set.has(id));
  }
}
