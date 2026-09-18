import { Folder } from '../entities/folder.entity';

export const FOLDER_REPOSITORY = Symbol('FOLDER_REPOSITORY');

export interface FolderRepository {
  findById(id: string): Promise<Folder | null>;
  findByCommunityAndTitleKey(
    communityId: string,
    titleKey: string,
  ): Promise<Folder | null>;
  findAllByCommunity(
    communityId: string,
    options?: { includeArchived?: boolean },
  ): Promise<Folder[]>;
  save(folder: Folder): Promise<void>;
}
