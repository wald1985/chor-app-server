import { Inject, Injectable } from '@nestjs/common';
import { FolderSong } from '../../../domain/entities/folder-song.entity';
import {
  FolderArchivedError,
  FolderNotFoundError,
  FolderSongNumberConflictError,
} from '../../../domain/errors/repertoire.errors';
import {
  FOLDER_REPOSITORY,
  type FolderRepository,
} from '../../../domain/ports/folder-repository.port';
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

export interface CreateFolderSongCommand {
  communityId: string;
  folderId: string;
  number: string | number;
  title: string;
  author?: string | null;
  arranger?: string | null;
  isNew?: boolean;
  themeIds?: string[];
}

@Injectable()
export class CreateFolderSongUseCase {
  constructor(
    @Inject(FOLDER_REPOSITORY)
    private readonly folderRepo: FolderRepository,
    @Inject(FOLDER_SONG_REPOSITORY)
    private readonly folderSongRepo: FolderSongRepository,
    @Inject(SONG_THEME_ASSIGNMENT_REPOSITORY)
    private readonly songThemeAssignmentRepo: SongThemeAssignmentRepository,
  ) {}

  async execute(command: CreateFolderSongCommand): Promise<FolderSong> {
    const folder = await this.folderRepo.findById(command.folderId);
    if (!folder || folder.communityId !== command.communityId) {
      throw new FolderNotFoundError(command.folderId);
    }
    if (folder.isArchived) {
      throw new FolderArchivedError(command.folderId);
    }

    const songNumber = new SongNumber(command.number);
    const existing = await this.folderSongRepo.findByFolderAndNumberKey(
      folder.id,
      songNumber.key,
    );
    if (existing) {
      throw new FolderSongNumberConflictError(folder.id, songNumber.value);
    }

    const song = FolderSong.create(folder, {
      number: songNumber,
      title: command.title,
      author: command.author,
      arranger: command.arranger,
      isNew: command.isNew ?? true,
    });

    await this.folderSongRepo.save(song);

    if (command.themeIds && command.themeIds.length > 0) {
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
