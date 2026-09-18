import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CommunityMemberGuard,
  CommunityPermission,
  JwtAuthGuard,
  RequirePermission,
} from '../../../identity';
import { GetCommunitySongsUseCase } from '../../application/use-cases/songs/get-community-songs.use-case';
import { SetSongThemesUseCase } from '../../application/use-cases/themes/set-song-themes.use-case';
import {
  THEME_REPOSITORY,
  type ThemeRepository,
} from '../../domain/ports/theme-repository.port';
import { ThemeSource } from '../../domain/value-objects/theme-source';
import { GetCommunitySongsQueryDto } from '../http/dto/songs-query.dto';
import { SetSongThemesDto } from '../http/dto/themes.dto';
import { toRepertoireHttpException } from '../http/repertoire-error-mapper';

@Controller('communities/:communityId/songs')
@UseGuards(JwtAuthGuard, CommunityMemberGuard)
export class CommunitySongsController {
  constructor(
    private readonly getCommunitySongsUseCase: GetCommunitySongsUseCase,
    private readonly setSongThemesUseCase: SetSongThemesUseCase,
    @Inject(THEME_REPOSITORY)
    private readonly themeRepo: ThemeRepository,
  ) {}

  @Get()
  async getSongs(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Query() query: GetCommunitySongsQueryDto,
  ) {
    try {
      return await this.getCommunitySongsUseCase.execute({
        communityId,
        songId: query.songId,
        search: query.search,
        themeIds: query.themeIds,
        containerId: query.containerId,
      });
    } catch (error) {
      throw toRepertoireHttpException(error);
    }
  }

  @Put(':songId/themes')
  @RequirePermission(CommunityPermission.REPERTOIRE_MANAGE)
  async setSongThemes(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('songId', ParseUUIDPipe) songId: string,
    @Body() dto: SetSongThemesDto,
  ) {
    try {
      const communityThemes = await this.themeRepo.findByIds(dto.themeIds);
      const communityThemeIds = new Set(communityThemes.map((t) => t.id));

      const themeAssignments = dto.themeIds.map((id) => ({
        themeId: id,
        themeSource: communityThemeIds.has(id)
          ? ThemeSource.COMMUNITY
          : ThemeSource.LIBRARY,
      }));

      await this.setSongThemesUseCase.execute({
        communityId,
        songId,
        themeAssignments,
      });

      return { success: true };
    } catch (error) {
      throw toRepertoireHttpException(error);
    }
  }
}
