import { FolderSong } from '../entities/folder-song.entity';

export const FOLDER_SONG_REPOSITORY = Symbol('FOLDER_SONG_REPOSITORY');

export interface FolderSongRepository {
  findById(id: string): Promise<FolderSong | null>;
  findByFolderAndNumberKey(
    folderId: string,
    numberKey: string,
  ): Promise<FolderSong | null>;
  findAllByFolder(
    folderId: string,
    options?: { includeArchived?: boolean },
  ): Promise<FolderSong[]>;
  findAllByCommunity(
    communityId: string,
    options?: { includeArchived?: boolean },
  ): Promise<FolderSong[]>;
  save(song: FolderSong): Promise<void>;
}
