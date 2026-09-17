import { Inject, Injectable } from '@nestjs/common';
import {
  ThemeArchivedError,
  ThemeNameTakenError,
  ThemeNotFoundError,
} from '../../../domain/errors/library.errors';
import { LIBRARY_UNIT_OF_WORK } from '../../../domain/ports/library-unit-of-work.port';
import type { LibraryUnitOfWork } from '../../../domain/ports/library-unit-of-work.port';
import { THEME_REPOSITORY } from '../../../domain/ports/theme-repository.port';
import type { ThemeRepository } from '../../../domain/ports/theme-repository.port';
import { ThemeName } from '../../../domain/value-objects/theme-name';

export interface RenameThemeCommand {
  id: string;
  name: string;
}

@Injectable()
export class RenameThemeUseCase {
  constructor(
    @Inject(THEME_REPOSITORY)
    private readonly themeRepo: ThemeRepository,
    @Inject(LIBRARY_UNIT_OF_WORK)
    private readonly uow: LibraryUnitOfWork,
  ) {}

  async execute(command: RenameThemeCommand): Promise<void> {
    await this.uow.run(async () => {
      const theme = await this.themeRepo.findById(command.id);
      if (!theme) {
        throw new ThemeNotFoundError(command.id);
      }
      if (theme.isArchived) {
        throw new ThemeArchivedError(command.id);
      }

      const newName = new ThemeName(command.name);
      if (theme.name.value === newName.value) {
        return;
      }

      if (theme.nameKey !== newName.key) {
        const existing = await this.themeRepo.findByNameKey(newName.key);
        if (existing && existing.id !== theme.id) {
          throw new ThemeNameTakenError(existing.id, existing.isArchived);
        }
      }

      theme.rename(newName);
      await this.themeRepo.save(theme);
    });
  }
}
