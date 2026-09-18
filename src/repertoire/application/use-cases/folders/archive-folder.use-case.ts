import { Inject, Injectable } from '@nestjs/common';
import { Folder } from '../../../domain/entities/folder.entity';
import { FolderNotFoundError } from '../../../domain/errors/repertoire.errors';
import {
  FOLDER_REPOSITORY,
  type FolderRepository,
} from '../../../domain/ports/folder-repository.port';

export interface ArchiveFolderCommand {
  communityId: string;
  folderId: string;
}

@Injectable()
export class ArchiveFolderUseCase {
  constructor(
    @Inject(FOLDER_REPOSITORY)
    private readonly folderRepo: FolderRepository,
  ) {}

  async execute(command: ArchiveFolderCommand): Promise<Folder> {
    const folder = await this.folderRepo.findById(command.folderId);
    if (!folder || folder.communityId !== command.communityId) {
      throw new FolderNotFoundError(command.folderId);
    }

    folder.archive(new Date());
    await this.folderRepo.save(folder);
    return folder;
  }
}
