import { Inject, Injectable } from '@nestjs/common';
import { Folder } from '../../../domain/entities/folder.entity';
import {
  FolderNotFoundError,
  FolderTitleConflictError,
} from '../../../domain/errors/repertoire.errors';
import {
  FOLDER_REPOSITORY,
  type FolderRepository,
} from '../../../domain/ports/folder-repository.port';
import { FolderTitle } from '../../../domain/value-objects/folder-title';

export interface RenameFolderCommand {
  communityId: string;
  folderId: string;
  title: string;
}

@Injectable()
export class RenameFolderUseCase {
  constructor(
    @Inject(FOLDER_REPOSITORY)
    private readonly folderRepo: FolderRepository,
  ) {}

  async execute(command: RenameFolderCommand): Promise<Folder> {
    const folder = await this.folderRepo.findById(command.folderId);
    if (!folder || folder.communityId !== command.communityId) {
      throw new FolderNotFoundError(command.folderId);
    }

    const title = new FolderTitle(command.title);
    if (title.key !== folder.titleKey) {
      const existing = await this.folderRepo.findByCommunityAndTitleKey(
        command.communityId,
        title.key,
      );
      if (existing && existing.id !== folder.id) {
        throw new FolderTitleConflictError(command.communityId, title.value);
      }
    }

    folder.rename(title);
    await this.folderRepo.save(folder);
    return folder;
  }
}
