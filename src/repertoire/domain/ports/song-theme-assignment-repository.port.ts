import { SongThemeAssignment } from '../entities/song-theme-assignment.entity';
import { ThemeSource } from '../value-objects/theme-source';

export const SONG_THEME_ASSIGNMENT_REPOSITORY = Symbol(
  'SONG_THEME_ASSIGNMENT_REPOSITORY',
);

export interface SongThemeAssignmentRepository {
  findByCommunityId(communityId: string): Promise<SongThemeAssignment[]>;
  findByCommunityAndSongId(
    communityId: string,
    songId: string,
  ): Promise<SongThemeAssignment[]>;
  findByCommunityAndSongIds(
    communityId: string,
    songIds: string[],
  ): Promise<SongThemeAssignment[]>;
  setSongThemes(
    communityId: string,
    songId: string,
    assignments: Array<{ themeSource: ThemeSource; themeId: string }>,
  ): Promise<void>;
}
