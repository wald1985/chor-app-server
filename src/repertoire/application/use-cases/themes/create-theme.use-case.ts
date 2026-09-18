import { Inject, Injectable } from '@nestjs/common';
import { Theme } from '../../../domain/entities/theme.entity';
import { ThemeNameConflictError } from '../../../domain/errors/repertoire.errors';
import {
  THEME_REPOSITORY,
  type ThemeRepository,
} from '../../../domain/ports/theme-repository.port';
import { ThemeName } from '../../../domain/value-objects/theme-name';

export interface CreateThemeCommand {
  communityId: string;
  name: string;
}

@Injectable()
export class CreateThemeUseCase {
  constructor(
    @Inject(THEME_REPOSITORY)
    private readonly themeRepo: ThemeRepository,
  ) {}

  async execute(command: CreateThemeCommand): Promise<Theme> {
    const name = new ThemeName(command.name);
    const existing = await this.themeRepo.findByCommunityAndNameKey(
      command.communityId,
      name.key,
    );
    if (existing) {
      throw new ThemeNameConflictError(command.communityId, name.value);
    }

    const theme = Theme.create({
      communityId: command.communityId,
      name,
    });

    await this.themeRepo.save(theme);
    return theme;
  }
}
