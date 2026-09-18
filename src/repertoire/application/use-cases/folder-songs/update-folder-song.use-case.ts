import { Inject, Injectable } from '@nestjs/common';
import { FolderSong } from '../../../domain/entities/folder-song.entity';
import {
  FolderSongArchivedError,
  FolderSongNotFoundError,
  FolderSongNumberConflictError,
} from '../../../domain/errors/repertoire.errors';
import {
  FOLDER_SONG_REPOSITORY,
  type FolderSongRepository,
} from '../../../domain/ports/folder-song-repository.port';
import {
  SONG_THEME_ASSIGNMENT_REPOSITORY,
  type SongThemeAssignmentRepository,
} from '../../../domain/ports/song-theme-assignment-repository.port';
import { SongNumber } from '../../../domain/value-objects/song-number';
import { ThemeSource } from '../../../domain/value-objects/theme-source';

export interface UpdateFolderSongCommand {
  communityId: string;
  folderId: string;
  songId: string;
  number?: string | number;
  title?: string;
  author?: string | null;
  arranger?: string | null;
  isNew?: boolean;
  themeIds?: string[];
}

@Injectable()
export class UpdateFolderSongUseCase {
  constructor(
    @Inject(FOLDER_SONG_REPOSITORY)
    private readonly folderSongRepo: FolderSongRepository,
    @Inject(SONG_THEME_ASSIGNMENT_REPOSITORY)
    private readonly songThemeAssignmentRepo: SongThemeAssignmentRepository,
  ) {}

  async execute(command: UpdateFolderSongCommand): Promise<FolderSong> {
    const song = await this.folderSongRepo.findById(command.songId);
    if (
      !song ||
      song.communityId !== command.communityId ||
      song.folderId !== command.folderId
    ) {
      throw new FolderSongNotFoundError(command.songId);
    }
    if (song.isArchived) {
      throw new FolderSongArchivedError(command.songId);
    }

    if (command.number !== undefined) {
      const songNumber = new SongNumber(command.number);
      if (songNumber.key !== song.numberKey) {
        const existing = await this.folderSongRepo.findByFolderAndNumberKey(
          song.folderId,
          songNumber.key,
        );
        if (existing && existing.id !== song.id) {
          throw new FolderSongNumberConflictError(
            song.folderId,
            songNumber.value,
          );
        }
        song.renumber(songNumber);
      }
    }

    song.update({
      title: command.title,
      author: command.author,
      arranger: command.arranger,
      isNew: command.isNew,
    });

    await this.folderSongRepo.save(song);

    if (command.themeIds !== undefined) {
      const uniqueThemes = Array.from(new Set(command.themeIds));
      await this.songThemeAssignmentRepo.setSongThemes(
        command.communityId,
        song.id,
        uniqueThemes.map((themeId) => ({
          themeSource: ThemeSource.COMMUNITY,
          themeId,
        })),
      );
    }

    return song;
  }
}
