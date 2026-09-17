import { Inject, Injectable } from '@nestjs/common';
import { ThemeNotFoundError } from '../../../domain/errors/library.errors';
import { CLOCK, Clock } from '../../../domain/ports/clock.port';
import {
  LIBRARY_UNIT_OF_WORK,
  LibraryUnitOfWork,
} from '../../../domain/ports/library-unit-of-work.port';
import {
  THEME_REPOSITORY,
  ThemeRepository,
} from '../../../domain/ports/theme-repository.port';

export interface ArchiveThemeCommand {
  id: string;
}

@Injectable()
export class ArchiveThemeUseCase {
  constructor(
    @Inject(THEME_REPOSITORY)
    private readonly themeRepo: ThemeRepository,
    @Inject(LIBRARY_UNIT_OF_WORK)
    private readonly uow: LibraryUnitOfWork,
    @Inject(CLOCK)
    private readonly clock: Clock,
  ) {}

  async execute(command: ArchiveThemeCommand): Promise<void> {
    await this.uow.run(async () => {
      const theme = await this.themeRepo.findById(command.id);
      if (!theme) {
        throw new ThemeNotFoundError(command.id);
      }
      if (theme.isArchived) {
        return;
      }

      theme.archive(this.clock.now());
      await this.themeRepo.save(theme);
    });
  }
}
