import { Inject, Injectable } from '@nestjs/common';
import { Folder } from '../../../domain/entities/folder.entity';
import {
  FOLDER_REPOSITORY,
  type FolderRepository,
} from '../../../domain/ports/folder-repository.port';

export interface ListFoldersQuery {
  communityId: string;
  includeArchived?: boolean;
}

@Injectable()
export class ListFoldersUseCase {
  constructor(
    @Inject(FOLDER_REPOSITORY)
    private readonly folderRepo: FolderRepository,
  ) {}

  async execute(query: ListFoldersQuery): Promise<Folder[]> {
    return this.folderRepo.findAllByCommunity(query.communityId, {
      includeArchived: query.includeArchived,
    });
  }
}
