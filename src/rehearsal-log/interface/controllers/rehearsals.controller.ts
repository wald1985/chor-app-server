import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { AddRehearsalEntryUseCase } from '../../application/use-cases/add-rehearsal-entry.use-case';
import { CreateRehearsalUseCase } from '../../application/use-cases/create-rehearsal.use-case';
import { DeleteRehearsalUseCase } from '../../application/use-cases/delete-rehearsal.use-case';
import { GetRehearsalUseCase } from '../../application/use-cases/get-rehearsal.use-case';
import { ListRehearsalsUseCase } from '../../application/use-cases/list-rehearsals.use-case';
import { RemoveRehearsalEntryUseCase } from '../../application/use-cases/remove-rehearsal-entry.use-case';
import { UpdateRehearsalUseCase } from '../../application/use-cases/update-rehearsal.use-case';
import {
  AddRehearsalEntryDto,
  CreateRehearsalDto,
  ListRehearsalsQueryDto,
  UpdateRehearsalDto,
} from '../dto/rehearsals.dto';
import { toRehearsalLogHttpException } from '../http/rehearsal-log-error-mapper';

@Controller('communities/:communityId/rehearsals')
@UseGuards(JwtAuthGuard, CommunityMemberGuard)
export class RehearsalsController {
  // eslint-disable-next-line max-params -- one use case per endpoint
  constructor(
    private readonly listUseCase: ListRehearsalsUseCase,
    private readonly getUseCase: GetRehearsalUseCase,
    private readonly createUseCase: CreateRehearsalUseCase,
    private readonly updateUseCase: UpdateRehearsalUseCase,
    private readonly deleteUseCase: DeleteRehearsalUseCase,
    private readonly addEntryUseCase: AddRehearsalEntryUseCase,
    private readonly removeEntryUseCase: RemoveRehearsalEntryUseCase,
  ) {}

  @Get()
  async list(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Query() query: ListRehearsalsQueryDto,
  ) {
    try {
      return await this.listUseCase.execute({ communityId, ...query });
    } catch (error) {
      throw toRehearsalLogHttpException(error);
    }
  }

  @Get(':rehearsalId')
  async get(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('rehearsalId', ParseUUIDPipe) rehearsalId: string,
  ) {
    try {
      return await this.getUseCase.execute({ communityId, rehearsalId });
    } catch (error) {
      throw toRehearsalLogHttpException(error);
    }
  }

  @Post()
  @RequirePermission(CommunityPermission.SINGING_LOG_MANAGE)
  async create(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Body() dto: CreateRehearsalDto,
  ) {
    try {
      return await this.createUseCase.execute({ communityId, ...dto });
    } catch (error) {
      throw toRehearsalLogHttpException(error);
    }
  }

  @Patch(':rehearsalId')
  @RequirePermission(CommunityPermission.SINGING_LOG_MANAGE)
  async update(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('rehearsalId', ParseUUIDPipe) rehearsalId: string,
    @Body() dto: UpdateRehearsalDto,
  ) {
    try {
      return await this.updateUseCase.execute({
        communityId,
        rehearsalId,
        warmUpLeaderId: dto.warmUpLeaderId,
        note: dto.note,
      });
    } catch (error) {
      throw toRehearsalLogHttpException(error);
    }
  }

  @Delete(':rehearsalId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(CommunityPermission.SINGING_LOG_MANAGE)
  async remove(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('rehearsalId', ParseUUIDPipe) rehearsalId: string,
  ) {
    try {
      await this.deleteUseCase.execute({ communityId, rehearsalId });
    } catch (error) {
      throw toRehearsalLogHttpException(error);
    }
  }

  @Post(':rehearsalId/entries')
  @RequirePermission(CommunityPermission.SINGING_LOG_MANAGE)
  async addEntry(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('rehearsalId', ParseUUIDPipe) rehearsalId: string,
    @Body() dto: AddRehearsalEntryDto,
  ) {
    try {
      return await this.addEntryUseCase.execute({
        communityId,
        rehearsalId,
        ...dto,
      });
    } catch (error) {
      throw toRehearsalLogHttpException(error);
    }
  }

  @Delete(':rehearsalId/entries/:entryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(CommunityPermission.SINGING_LOG_MANAGE)
  async removeEntry(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('rehearsalId', ParseUUIDPipe) rehearsalId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    try {
      await this.removeEntryUseCase.execute({
        communityId,
        rehearsalId,
        entryId,
      });
    } catch (error) {
      throw toRehearsalLogHttpException(error);
    }
  }
}
