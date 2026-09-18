import { Inject, Injectable } from '@nestjs/common';
import { Folder } from '../../../domain/entities/folder.entity';
import { FolderTitleConflictError } from '../../../domain/errors/repertoire.errors';
import {
  FOLDER_REPOSITORY,
  type FolderRepository,
} from '../../../domain/ports/folder-repository.port';
import { FolderTitle } from '../../../domain/value-objects/folder-title';

export interface CreateFolderCommand {
  communityId: string;
  title: string;
}

@Injectable()
export class CreateFolderUseCase {
  constructor(
    @Inject(FOLDER_REPOSITORY)
    private readonly folderRepo: FolderRepository,
  ) {}

  async execute(command: CreateFolderCommand): Promise<Folder> {
    const title = new FolderTitle(command.title);
    const existing = await this.folderRepo.findByCommunityAndTitleKey(
      command.communityId,
      title.key,
    );
    if (existing) {
      throw new FolderTitleConflictError(command.communityId, title.value);
    }

    const folder = Folder.create({
      communityId: command.communityId,
      title,
    });

    await this.folderRepo.save(folder);
    return folder;
  }
}
