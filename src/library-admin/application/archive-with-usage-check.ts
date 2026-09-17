import { Inject, Injectable } from '@nestjs/common';
import {
  ArchiveBookUseCase,
  ArchiveSongUseCase,
  ArchiveThemeUseCase,
  LibraryItemInUseError,
} from '../../library';
import { LIBRARY_USAGE_PROVIDER } from './ports/library-usage-provider.port';
import type {
  LibraryUsageItemRef,
  LibraryUsageProvider,
} from './ports/library-usage-provider.port';

@Injectable()
export class ArchiveWithUsageCheck {
  constructor(
    @Inject(LIBRARY_USAGE_PROVIDER)
    private readonly usageProvider: LibraryUsageProvider,
    private readonly archiveBookUseCase: ArchiveBookUseCase,
    private readonly archiveSongUseCase: ArchiveSongUseCase,
    private readonly archiveThemeUseCase: ArchiveThemeUseCase,
  ) {}

  async archiveBook(id: string, confirmInUse = false): Promise<void> {
    await this.checkUsage({ type: 'BOOK', id }, confirmInUse);
    await this.archiveBookUseCase.execute({ id });
  }

  async archiveSong(id: string, confirmInUse = false): Promise<void> {
    await this.checkUsage({ type: 'SONG', id }, confirmInUse);
    await this.archiveSongUseCase.execute({ id });
  }

  async archiveTheme(id: string, confirmInUse = false): Promise<void> {
    await this.checkUsage({ type: 'THEME', id }, confirmInUse);
    await this.archiveThemeUseCase.execute({ id });
  }

  async checkImportArchivedUsage(
    refs: LibraryUsageItemRef[],
    confirmInUse = false,
  ): Promise<void> {
    if (confirmInUse || refs.length === 0) {
      return;
    }
    const usages = await this.usageProvider.countUsage(refs);
    for (const u of usages) {
      if (u.communities > 0 || u.references > 0) {
        throw new LibraryItemInUseError({
          communities: u.communities,
          references: u.references,
        });
      }
    }
  }

  private async checkUsage(
    ref: LibraryUsageItemRef,
    confirmInUse: boolean,
  ): Promise<void> {
    if (confirmInUse) {
      return;
    }
    const [usage] = await this.usageProvider.countUsage([ref]);
    if (usage && (usage.communities > 0 || usage.references > 0)) {
      throw new LibraryItemInUseError({
        communities: usage.communities,
        references: usage.references,
      });
    }
  }
}
