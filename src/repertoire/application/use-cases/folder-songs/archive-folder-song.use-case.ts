import { Inject, Injectable } from '@nestjs/common';
import { FolderSong } from '../../../domain/entities/folder-song.entity';
import { FolderSongNotFoundError } from '../../../domain/errors/repertoire.errors';
import {
  FOLDER_SONG_REPOSITORY,
  type FolderSongRepository,
} from '../../../domain/ports/folder-song-repository.port';

export interface ArchiveFolderSongCommand {
  communityId: string;
  folderId: string;
  songId: string;
}

@Injectable()
export class ArchiveFolderSongUseCase {
  constructor(
    @Inject(FOLDER_SONG_REPOSITORY)
    private readonly folderSongRepo: FolderSongRepository,
  ) {}

  async execute(command: ArchiveFolderSongCommand): Promise<FolderSong> {
    const song = await this.folderSongRepo.findById(command.songId);
    if (
      !song ||
      song.communityId !== command.communityId ||
      song.folderId !== command.folderId
    ) {
      throw new FolderSongNotFoundError(command.songId);
    }

    song.archive(new Date());
    await this.folderSongRepo.save(song);
    return song;
  }
}
