import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RestoreSongUseCase, SongView } from '../../../library';
import { SuperadminAuthGuard } from '../../../superadmin';
import { ArchiveWithUsageCheck } from '../../application/archive-with-usage-check';
import { SongAdminService } from '../../application/song-admin.service';
import {
  ArchiveSongQueryDto,
  CreateSongDto,
  PatchSongDto,
  SetSongThemesDto,
} from '../dto/admin-songs.dto';
import { toLibraryAdminHttpException } from '../http/library-admin-error-mapper';

@Controller('admin/library')
@UseGuards(SuperadminAuthGuard)
export class AdminSongsController {
  constructor(
    private readonly songAdminService: SongAdminService,
    private readonly restoreSongUseCase: RestoreSongUseCase,
    private readonly archiveWithUsageCheck: ArchiveWithUsageCheck,
  ) {}

  @Post('books/:bookId/songs')
  async createSong(
    @Param('bookId', ParseUUIDPipe) bookId: string,
    @Body() dto: CreateSongDto,
  ): Promise<SongView> {
    try {
      return await this.songAdminService.createSong({
        bookId,
        number: dto.number,
        title: dto.title,
        author: dto.author,
        arranger: dto.arranger,
        themeIds: dto.themeIds,
      });
    } catch (error) {
      throw toLibraryAdminHttpException(error);
    }
  }

  @Patch('songs/:songId')
  async updateSong(
    @Param('songId', ParseUUIDPipe) songId: string,
    @Body() dto: PatchSongDto,
  ): Promise<void> {
    if (
      dto.number === undefined &&
      dto.title === undefined &&
      dto.author === undefined &&
      dto.arranger === undefined
    ) {
      throw new BadRequestException('At least one field must be provided');
    }

    try {
      await this.songAdminService.updateSong({
        id: songId,
        number: dto.number,
        title: dto.title,
        author: dto.author,
        arranger: dto.arranger,
      });
    } catch (error) {
      throw toLibraryAdminHttpException(error);
    }
  }

  @Put('songs/:songId/themes')
  async setSongThemes(
    @Param('songId', ParseUUIDPipe) songId: string,
    @Body() dto: SetSongThemesDto,
  ): Promise<void> {
    try {
      await this.songAdminService.setSongThemes({
        songId,
        themeIds: dto.themeIds,
      });
    } catch (error) {
      throw toLibraryAdminHttpException(error);
    }
  }

  @Post('songs/:songId/archive')
  @HttpCode(HttpStatus.OK)
  async archiveSong(
    @Param('songId', ParseUUIDPipe) songId: string,
    @Query() query: ArchiveSongQueryDto,
  ): Promise<void> {
    try {
      await this.archiveWithUsageCheck.archiveSong(songId, query.confirmInUse);
    } catch (error) {
      throw toLibraryAdminHttpException(error);
    }
  }

  @Post('songs/:songId/restore')
  @HttpCode(HttpStatus.OK)
  async restoreSong(
    @Param('songId', ParseUUIDPipe) songId: string,
  ): Promise<void> {
    try {
      await this.restoreSongUseCase.execute({ id: songId });
    } catch (error) {
      throw toLibraryAdminHttpException(error);
    }
  }
}
