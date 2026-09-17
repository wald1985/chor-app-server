import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../identity/interface/guards/jwt-auth.guard';
import {
  CreateThemeUseCase,
  RenameThemeUseCase,
  RestoreThemeUseCase,
  ThemeView,
} from '../../../library';
import { ArchiveWithUsageCheck } from '../../application/archive-with-usage-check';
import {
  ArchiveThemeQueryDto,
  CreateThemeDto,
  PatchThemeDto,
} from '../dto/admin-themes.dto';
import { SuperAdminGuard } from '../guards/super-admin.guard';
import { toLibraryAdminHttpException } from '../http/library-admin-error-mapper';

@Controller('admin/library/themes')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminThemesController {
  constructor(
    private readonly createThemeUseCase: CreateThemeUseCase,
    private readonly renameThemeUseCase: RenameThemeUseCase,
    private readonly restoreThemeUseCase: RestoreThemeUseCase,
    private readonly archiveWithUsageCheck: ArchiveWithUsageCheck,
  ) {}

  @Post()
  async createTheme(@Body() dto: CreateThemeDto): Promise<ThemeView> {
    try {
      return await this.createThemeUseCase.execute({ name: dto.name });
    } catch (error) {
      throw toLibraryAdminHttpException(error);
    }
  }

  @Patch(':themeId')
  async renameTheme(
    @Param('themeId', ParseUUIDPipe) themeId: string,
    @Body() dto: PatchThemeDto,
  ): Promise<void> {
    try {
      await this.renameThemeUseCase.execute({
        id: themeId,
        name: dto.name,
      });
    } catch (error) {
      throw toLibraryAdminHttpException(error);
    }
  }

  @Post(':themeId/archive')
  @HttpCode(HttpStatus.OK)
  async archiveTheme(
    @Param('themeId', ParseUUIDPipe) themeId: string,
    @Query() query: ArchiveThemeQueryDto,
  ): Promise<void> {
    try {
      await this.archiveWithUsageCheck.archiveTheme(
        themeId,
        query.confirmInUse,
      );
    } catch (error) {
      throw toLibraryAdminHttpException(error);
    }
  }

  @Post(':themeId/restore')
  @HttpCode(HttpStatus.OK)
  async restoreTheme(
    @Param('themeId', ParseUUIDPipe) themeId: string,
  ): Promise<void> {
    try {
      await this.restoreThemeUseCase.execute({ id: themeId });
    } catch (error) {
      throw toLibraryAdminHttpException(error);
    }
  }
}
