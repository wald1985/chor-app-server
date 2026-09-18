import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CommunityMemberGuard,
  CommunityPermission,
  JwtAuthGuard,
  RequirePermission,
} from '../../../identity';
import { ArchiveFolderSongUseCase } from '../../application/use-cases/folder-songs/archive-folder-song.use-case';
import { CreateFolderSongUseCase } from '../../application/use-cases/folder-songs/create-folder-song.use-case';
import { UpdateFolderSongUseCase } from '../../application/use-cases/folder-songs/update-folder-song.use-case';
import {
  CreateFolderSongDto,
  UpdateFolderSongDto,
} from '../http/dto/folder-songs.dto';
import { toRepertoireHttpException } from '../http/repertoire-error-mapper';

@Controller('communities/:communityId/folders/:folderId/songs')
@UseGuards(JwtAuthGuard, CommunityMemberGuard)
export class CommunityFolderSongsController {
  constructor(
    private readonly createFolderSongUseCase: CreateFolderSongUseCase,
    private readonly updateFolderSongUseCase: UpdateFolderSongUseCase,
    private readonly archiveFolderSongUseCase: ArchiveFolderSongUseCase,
  ) {}

  @Post()
  @RequirePermission(CommunityPermission.REPERTOIRE_MANAGE)
  async createFolderSong(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Body() dto: CreateFolderSongDto,
  ) {
    try {
      const song = await this.createFolderSongUseCase.execute({
        communityId,
        folderId,
        number: dto.number,
        title: dto.title,
        author: dto.author,
        arranger: dto.arranger,
        isNew: dto.isNew,
        themeIds: dto.themeIds,
      });
      return {
        id: song.id,
        communityId: song.communityId,
        folderId: song.folderId,
        number: song.numberValue,
        title: song.titleValue,
        author: song.authorValue,
        arranger: song.arrangerValue,
        isNew: song.isNew,
        archived: song.isArchived,
        archivedAt: song.archivedAt,
        createdAt: song.createdAt,
      };
    } catch (error) {
      throw toRepertoireHttpException(error);
    }
  }

  @Patch(':songId')
  @RequirePermission(CommunityPermission.REPERTOIRE_MANAGE)
  async updateFolderSong(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Param('songId', ParseUUIDPipe) songId: string,
    @Body() dto: UpdateFolderSongDto,
  ) {
    try {
      const song = await this.updateFolderSongUseCase.execute({
        communityId,
        folderId,
        songId,
        number: dto.number,
        title: dto.title,
        author: dto.author,
        arranger: dto.arranger,
        isNew: dto.isNew,
      });
      return {
        id: song.id,
        communityId: song.communityId,
        folderId: song.folderId,
        number: song.numberValue,
        title: song.titleValue,
        author: song.authorValue,
        arranger: song.arrangerValue,
        isNew: song.isNew,
        archived: song.isArchived,
        archivedAt: song.archivedAt,
        createdAt: song.createdAt,
      };
    } catch (error) {
      throw toRepertoireHttpException(error);
    }
  }

  @Post(':songId/archive')
  @RequirePermission(CommunityPermission.REPERTOIRE_MANAGE)
  async archiveFolderSong(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Param('songId', ParseUUIDPipe) songId: string,
  ) {
    try {
      await this.archiveFolderSongUseCase.execute({
        communityId,
        folderId,
        songId,
      });
      return { success: true };
    } catch (error) {
      throw toRepertoireHttpException(error);
    }
  }
}
