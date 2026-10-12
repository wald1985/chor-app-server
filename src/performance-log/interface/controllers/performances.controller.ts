import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CommunityMemberGuard,
  CommunityPermission,
  JwtAuthGuard,
  RequirePermission,
} from '../../../identity';
import { DeletePerformanceUseCase } from '../../application/use-cases/delete-performance.use-case';
import { GetPerformanceUseCase } from '../../application/use-cases/get-performance.use-case';
import { ListPerformancesUseCase } from '../../application/use-cases/list-performances.use-case';
import { RecordPerformanceUseCase } from '../../application/use-cases/record-performance.use-case';
import {
  ListPerformancesQueryDto,
  RecordPerformanceDto,
} from '../dto/performances.dto';
import { toPerformanceLogHttpException } from '../http/performance-log-error-mapper';

@Controller('communities/:communityId/performances')
@UseGuards(JwtAuthGuard, CommunityMemberGuard)
export class PerformancesController {
  constructor(
    private readonly listUseCase: ListPerformancesUseCase,
    private readonly getUseCase: GetPerformanceUseCase,
    private readonly recordUseCase: RecordPerformanceUseCase,
    private readonly deleteUseCase: DeletePerformanceUseCase,
  ) {}

  @Get()
  async list(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Query() query: ListPerformancesQueryDto,
  ) {
    try {
      return await this.listUseCase.execute({ communityId, ...query });
    } catch (error) {
      throw toPerformanceLogHttpException(error);
    }
  }

  @Get(':performanceId')
  async get(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('performanceId', ParseUUIDPipe) performanceId: string,
  ) {
    try {
      return await this.getUseCase.execute({ communityId, performanceId });
    } catch (error) {
      throw toPerformanceLogHttpException(error);
    }
  }

  @Post()
  @RequirePermission(CommunityPermission.SINGING_LOG_MANAGE)
  async record(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Body() dto: RecordPerformanceDto,
  ) {
    try {
      return await this.recordUseCase.execute({ communityId, ...dto });
    } catch (error) {
      throw toPerformanceLogHttpException(error);
    }
  }

  @Delete(':performanceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(CommunityPermission.SINGING_LOG_MANAGE)
  async remove(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('performanceId', ParseUUIDPipe) performanceId: string,
  ) {
    try {
      await this.deleteUseCase.execute({ communityId, performanceId });
    } catch (error) {
      throw toPerformanceLogHttpException(error);
    }
  }
}
