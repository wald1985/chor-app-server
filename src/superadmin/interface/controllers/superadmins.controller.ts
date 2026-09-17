import {
  BadRequestException,
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
  Put,
  UseGuards,
} from '@nestjs/common';
import { CreateSuperadminUseCase } from '../../application/use-cases/superadmins/create-superadmin.use-case';
import { DeleteSuperadminUseCase } from '../../application/use-cases/superadmins/delete-superadmin.use-case';
import { GetSuperadminUseCase } from '../../application/use-cases/superadmins/get-superadmin.use-case';
import { ListSuperadminsUseCase } from '../../application/use-cases/superadmins/list-superadmins.use-case';
import { SetSuperadminPasswordUseCase } from '../../application/use-cases/superadmins/set-superadmin-password.use-case';
import { UpdateSuperadminUseCase } from '../../application/use-cases/superadmins/update-superadmin.use-case';
import { CurrentSuperadmin } from '../decorators/current-superadmin.decorator';
import { CreateSuperadminDto } from '../dto/create-superadmin.dto';
import { SetPasswordDto } from '../dto/set-password.dto';
import { UpdateSuperadminDto } from '../dto/update-superadmin.dto';
import { SuperadminAuthGuard } from '../guards/superadmin-auth.guard';
import { toSuperadminHttpException } from '../http/superadmin-error-mapper';
import type { SuperadminPrincipal } from '../../infrastructure/security/superadmin-jwt.strategy';

@Controller('admin/superadmins')
@UseGuards(SuperadminAuthGuard)
export class SuperadminsController {
  // eslint-disable-next-line max-params -- one use case per endpoint, all needed for DI
  constructor(
    private readonly listSuperadminsUseCase: ListSuperadminsUseCase,
    private readonly getSuperadminUseCase: GetSuperadminUseCase,
    private readonly createSuperadminUseCase: CreateSuperadminUseCase,
    private readonly updateSuperadminUseCase: UpdateSuperadminUseCase,
    private readonly setSuperadminPasswordUseCase: SetSuperadminPasswordUseCase,
    private readonly deleteSuperadminUseCase: DeleteSuperadminUseCase,
  ) {}

  @Get()
  async list(@CurrentSuperadmin() actor: SuperadminPrincipal) {
    try {
      return await this.listSuperadminsUseCase.execute(actor.id);
    } catch (error) {
      throw toSuperadminHttpException(error);
    }
  }

  @Get(':id')
  async get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentSuperadmin() actor: SuperadminPrincipal,
  ) {
    try {
      return await this.getSuperadminUseCase.execute(id, actor.id);
    } catch (error) {
      throw toSuperadminHttpException(error);
    }
  }

  @Post()
  async create(
    @Body() dto: CreateSuperadminDto,
    @CurrentSuperadmin() actor: SuperadminPrincipal,
  ) {
    try {
      return await this.createSuperadminUseCase.execute(dto, actor.id);
    } catch (error) {
      throw toSuperadminHttpException(error);
    }
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSuperadminDto,
    @CurrentSuperadmin() actor: SuperadminPrincipal,
  ) {
    if (dto.name === undefined && dto.email === undefined) {
      throw new BadRequestException('At least one field must be provided');
    }

    try {
      return await this.updateSuperadminUseCase.execute(
        { id, name: dto.name, email: dto.email },
        actor.id,
      );
    } catch (error) {
      throw toSuperadminHttpException(error);
    }
  }

  @Put(':id/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async setPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetPasswordDto,
    @CurrentSuperadmin() actor: SuperadminPrincipal,
  ): Promise<void> {
    try {
      await this.setSuperadminPasswordUseCase.execute(
        { id, newPassword: dto.newPassword },
        actor.id,
      );
    } catch (error) {
      throw toSuperadminHttpException(error);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentSuperadmin() actor: SuperadminPrincipal,
  ): Promise<void> {
    try {
      await this.deleteSuperadminUseCase.execute(id, actor.id);
    } catch (error) {
      throw toSuperadminHttpException(error);
    }
  }
}
