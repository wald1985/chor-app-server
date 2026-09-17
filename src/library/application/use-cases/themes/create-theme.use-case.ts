import { Inject, Injectable } from '@nestjs/common';
import { LibraryTheme } from '../../../domain/entities/library-theme.entity';
import { ThemeNameTakenError } from '../../../domain/errors/library.errors';
import {
  ID_GENERATOR,
  IdGenerator,
} from '../../../domain/ports/id-generator.port';
import {
  LIBRARY_UNIT_OF_WORK,
  LibraryUnitOfWork,
} from '../../../domain/ports/library-unit-of-work.port';
import {
  THEME_REPOSITORY,
  ThemeRepository,
} from '../../../domain/ports/theme-repository.port';
import { ThemeName } from '../../../domain/value-objects/theme-name';
import { ThemeView } from '../../views/library.views';
import { toThemeView } from '../../views/view-mappers';

export interface CreateThemeCommand {
  name: string;
}

@Injectable()
export class CreateThemeUseCase {
  constructor(
    @Inject(THEME_REPOSITORY)
    private readonly themeRepo: ThemeRepository,
    @Inject(LIBRARY_UNIT_OF_WORK)
    private readonly uow: LibraryUnitOfWork,
    @Inject(ID_GENERATOR)
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(command: CreateThemeCommand): Promise<ThemeView> {
    return this.uow.run(async () => {
      const name = new ThemeName(command.name);
      const existing = await this.themeRepo.findByNameKey(name.key);
      if (existing) {
        throw new ThemeNameTakenError(existing.id, existing.isArchived);
      }

      const id = this.idGenerator.generateId();
      const theme = LibraryTheme.create({ id, name });
      await this.themeRepo.create(theme);

      return toThemeView(theme, 0);
    });
  }
}
