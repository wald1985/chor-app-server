import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CommunityMemberGuard,
  CommunityPermission,
  JwtAuthGuard,
  RequirePermission,
} from '../../../identity';
import { CreateThemeUseCase } from '../../application/use-cases/themes/create-theme.use-case';
import { GetCommunityThemesUseCase } from '../../application/use-cases/themes/get-community-themes.use-case';
import { CreateThemeDto } from '../http/dto/themes.dto';
import { toRepertoireHttpException } from '../http/repertoire-error-mapper';

@Controller('communities/:communityId/themes')
@UseGuards(JwtAuthGuard, CommunityMemberGuard)
export class CommunityThemesController {
  constructor(
    private readonly getCommunityThemesUseCase: GetCommunityThemesUseCase,
    private readonly createThemeUseCase: CreateThemeUseCase,
  ) {}

  @Get()
  async getThemes(@Param('communityId', ParseUUIDPipe) communityId: string) {
    try {
      return await this.getCommunityThemesUseCase.execute({ communityId });
    } catch (error) {
      throw toRepertoireHttpException(error);
    }
  }

  @Post()
  @RequirePermission(CommunityPermission.REPERTOIRE_MANAGE)
  async createTheme(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Body() dto: CreateThemeDto,
  ) {
    try {
      const theme = await this.createThemeUseCase.execute({
        communityId,
        name: dto.name,
      });
      return {
        id: theme.id,
        communityId: theme.communityId,
        name: theme.nameValue,
        archived: theme.isArchived,
        archivedAt: theme.archivedAt,
        createdAt: theme.createdAt,
      };
    } catch (error) {
      throw toRepertoireHttpException(error);
    }
  }
}
