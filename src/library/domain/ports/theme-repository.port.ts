import { LibraryTheme } from '../entities/library-theme.entity';

export interface ThemeRepository {
  findById(id: string): Promise<LibraryTheme | null>;
  findByNameKey(nameKey: string): Promise<LibraryTheme | null>;
  findByIds(ids: string[]): Promise<LibraryTheme[]>;
  findAll(options?: { includeArchived?: boolean }): Promise<LibraryTheme[]>;
  save(theme: LibraryTheme): Promise<void>;
  create(theme: LibraryTheme): Promise<void>;
  createMany(themes: LibraryTheme[]): Promise<void>;
}

export const THEME_REPOSITORY = Symbol('THEME_REPOSITORY');
