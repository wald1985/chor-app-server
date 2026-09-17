import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../identity/interface/guards/jwt-auth.guard';
import {
  ArchiveSeriesUseCase,
  CreateSeriesUseCase,
  RenameSeriesUseCase,
  RestoreSeriesUseCase,
  SeriesView,
} from '../../../library';
import { CreateSeriesDto, PatchSeriesDto } from '../dto/admin-series.dto';
import { SuperAdminGuard } from '../guards/super-admin.guard';
import { toLibraryAdminHttpException } from '../http/library-admin-error-mapper';

@Controller('admin/library/series')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminSeriesController {
  constructor(
    private readonly createSeriesUseCase: CreateSeriesUseCase,
    private readonly renameSeriesUseCase: RenameSeriesUseCase,
    private readonly archiveSeriesUseCase: ArchiveSeriesUseCase,
    private readonly restoreSeriesUseCase: RestoreSeriesUseCase,
  ) {}

  @Post()
  async createSeries(@Body() dto: CreateSeriesDto): Promise<SeriesView> {
    try {
      return await this.createSeriesUseCase.execute({ title: dto.title });
    } catch (error) {
      throw toLibraryAdminHttpException(error);
    }
  }

  @Patch(':seriesId')
  async renameSeries(
    @Param('seriesId', ParseUUIDPipe) seriesId: string,
    @Body() dto: PatchSeriesDto,
  ): Promise<void> {
    try {
      await this.renameSeriesUseCase.execute({
        id: seriesId,
        title: dto.title,
      });
    } catch (error) {
      throw toLibraryAdminHttpException(error);
    }
  }

  @Post(':seriesId/archive')
  @HttpCode(HttpStatus.OK)
  async archiveSeries(
    @Param('seriesId', ParseUUIDPipe) seriesId: string,
  ): Promise<void> {
    try {
      await this.archiveSeriesUseCase.execute({ id: seriesId });
    } catch (error) {
      throw toLibraryAdminHttpException(error);
    }
  }

  @Post(':seriesId/restore')
  @HttpCode(HttpStatus.OK)
  async restoreSeries(
    @Param('seriesId', ParseUUIDPipe) seriesId: string,
  ): Promise<void> {
    try {
      await this.restoreSeriesUseCase.execute({ id: seriesId });
    } catch (error) {
      throw toLibraryAdminHttpException(error);
    }
  }
}
