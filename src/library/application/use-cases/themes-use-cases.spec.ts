import { LibraryTheme } from '../../domain/entities/library-theme.entity';
import {
  ThemeArchivedError,
  ThemeNameTakenError,
  ThemeNotFoundError,
} from '../../domain/errors/library.errors';
import { ArchiveThemeUseCase } from './themes/archive-theme.use-case';
import { CreateThemeUseCase } from './themes/create-theme.use-case';
import { RenameThemeUseCase } from './themes/rename-theme.use-case';
import { RestoreThemeUseCase } from './themes/restore-theme.use-case';
import {
  FakeClock,
  FakeIdGenerator,
  FakeUnitOfWork,
  InMemoryThemeRepository,
} from './test-helpers';

describe('Theme Use Cases (Unit)', () => {
  let themeRepo: InMemoryThemeRepository;
  let uow: FakeUnitOfWork;
  let idGenerator: FakeIdGenerator;
  let clock: FakeClock;

  let createTheme: CreateThemeUseCase;
  let renameTheme: RenameThemeUseCase;
  let archiveTheme: ArchiveThemeUseCase;
  let restoreTheme: RestoreThemeUseCase;

  beforeEach(() => {
    themeRepo = new InMemoryThemeRepository();
    uow = new FakeUnitOfWork();
    idGenerator = new FakeIdGenerator();
    clock = new FakeClock();

    createTheme = new CreateThemeUseCase(themeRepo, uow, idGenerator);
    renameTheme = new RenameThemeUseCase(themeRepo, uow);
    archiveTheme = new ArchiveThemeUseCase(themeRepo, uow, clock);
    restoreTheme = new RestoreThemeUseCase(themeRepo, uow);
  });

  describe('CreateThemeUseCase', () => {
    it('creates a new theme inside UoW and returns ThemeView', async () => {
      const view = await createTheme.execute({ name: 'Lobpreis' });

      expect(uow.runCallCount).toBe(1);
      expect(view.id).toBe('id-1');
      expect(view.name).toBe('Lobpreis');
      expect(view.songCount).toBe(0);
      expect(view.archived).toBe(false);

      const inRepo = await themeRepo.findById('id-1');
      expect(inRepo).toBeDefined();
      expect(inRepo?.nameValue).toBe('Lobpreis');
    });

    it('throws ThemeNameTakenError if theme name is already taken (active)', async () => {
      await themeRepo.create(
        LibraryTheme.create({ id: 't1', name: 'Lobpreis' }),
      );

      await expect(createTheme.execute({ name: 'lobpreis' })).rejects.toThrow(
        ThemeNameTakenError,
      );
    });

    it('throws ThemeNameTakenError if theme name is already taken (archived)', async () => {
      const t = LibraryTheme.create({ id: 't1', name: 'Altes Thema' });
      t.archive(clock.now());
      await themeRepo.create(t);

      await expect(
        createTheme.execute({ name: 'altes thema' }),
      ).rejects.toThrow(ThemeNameTakenError);
    });
  });

  describe('RenameThemeUseCase', () => {
    it('renames theme successfully', async () => {
      await themeRepo.create(LibraryTheme.create({ id: 't1', name: 'Alt' }));

      await renameTheme.execute({ id: 't1', name: 'Neu' });

      expect(themeRepo.saveCallCount).toBe(1);
      const updated = await themeRepo.findById('t1');
      expect(updated?.nameValue).toBe('Neu');
    });

    it('throws ThemeNotFoundError if theme does not exist', async () => {
      await expect(
        renameTheme.execute({ id: 't404', name: 'Neu' }),
      ).rejects.toThrow(ThemeNotFoundError);
    });

    it('throws ThemeArchivedError if theme is archived', async () => {
      const t = LibraryTheme.create({ id: 't1', name: 'Thema' });
      t.archive(clock.now());
      await themeRepo.create(t);

      await expect(
        renameTheme.execute({ id: 't1', name: 'Neu' }),
      ).rejects.toThrow(ThemeArchivedError);
    });

    it('throws ThemeNameTakenError if new name is taken by another theme', async () => {
      await themeRepo.create(LibraryTheme.create({ id: 't1', name: 'Alpha' }));
      await themeRepo.create(LibraryTheme.create({ id: 't2', name: 'Beta' }));

      await expect(
        renameTheme.execute({ id: 't2', name: 'Alpha' }),
      ).rejects.toThrow(ThemeNameTakenError);
    });

    it('does not save if name is unchanged', async () => {
      await themeRepo.create(LibraryTheme.create({ id: 't1', name: 'Gleich' }));

      await renameTheme.execute({ id: 't1', name: 'Gleich' });

      expect(themeRepo.saveCallCount).toBe(0);
    });
  });

  describe('ArchiveThemeUseCase', () => {
    it('archives theme successfully', async () => {
      await themeRepo.create(LibraryTheme.create({ id: 't1', name: 'Thema' }));

      await archiveTheme.execute({ id: 't1' });

      expect(themeRepo.saveCallCount).toBe(1);
      const updated = await themeRepo.findById('t1');
      expect(updated?.isArchived).toBe(true);
    });

    it('is idempotent and does not save if already archived', async () => {
      const t = LibraryTheme.create({ id: 't1', name: 'Thema' });
      t.archive(clock.now());
      await themeRepo.create(t);

      await archiveTheme.execute({ id: 't1' });

      expect(themeRepo.saveCallCount).toBe(0);
    });
  });

  describe('RestoreThemeUseCase', () => {
    it('restores archived theme successfully', async () => {
      const t = LibraryTheme.create({ id: 't1', name: 'Thema' });
      t.archive(clock.now());
      await themeRepo.create(t);

      await restoreTheme.execute({ id: 't1' });

      expect(themeRepo.saveCallCount).toBe(1);
      const updated = await themeRepo.findById('t1');
      expect(updated?.isArchived).toBe(false);
    });

    it('is idempotent and does not save if already active', async () => {
      await themeRepo.create(LibraryTheme.create({ id: 't1', name: 'Thema' }));

      await restoreTheme.execute({ id: 't1' });

      expect(themeRepo.saveCallCount).toBe(0);
    });
  });
});
