import { Theme } from '../entities/theme.entity';

export const THEME_REPOSITORY = Symbol('THEME_REPOSITORY');

export interface ThemeRepository {
  findById(id: string): Promise<Theme | null>;
  findByIds(ids: string[]): Promise<Theme[]>;
  findByCommunityAndNameKey(
    communityId: string,
    nameKey: string,
  ): Promise<Theme | null>;
  findAllByCommunity(
    communityId: string,
    options?: { includeArchived?: boolean },
  ): Promise<Theme[]>;
  save(theme: Theme): Promise<void>;
}
