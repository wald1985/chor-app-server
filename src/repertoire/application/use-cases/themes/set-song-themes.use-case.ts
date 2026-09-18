import { Inject, Injectable } from '@nestjs/common';
import {
  SONG_THEME_ASSIGNMENT_REPOSITORY,
  type SongThemeAssignmentRepository,
} from '../../../domain/ports/song-theme-assignment-repository.port';
import { ThemeSource } from '../../../domain/value-objects/theme-source';

export interface SetSongThemesCommand {
  communityId: string;
  songId: string;
  themeAssignments: Array<{ themeSource: ThemeSource; themeId: string }>;
}

@Injectable()
export class SetSongThemesUseCase {
  constructor(
    @Inject(SONG_THEME_ASSIGNMENT_REPOSITORY)
    private readonly songThemeAssignmentRepo: SongThemeAssignmentRepository,
  ) {}

  async execute(command: SetSongThemesCommand): Promise<void> {
    await this.songThemeAssignmentRepo.setSongThemes(
      command.communityId,
      command.songId,
      command.themeAssignments,
    );
  }
}
