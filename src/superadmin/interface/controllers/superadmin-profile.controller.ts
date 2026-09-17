import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ChangeOwnPasswordUseCase } from '../../application/use-cases/profile/change-own-password.use-case';
import { GetProfileUseCase } from '../../application/use-cases/profile/get-profile.use-case';
import { UpdateProfileUseCase } from '../../application/use-cases/profile/update-profile.use-case';
import { CurrentSuperadmin } from '../decorators/current-superadmin.decorator';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { SuperadminAuthGuard } from '../guards/superadmin-auth.guard';
import { toSuperadminHttpException } from '../http/superadmin-error-mapper';
import type { SuperadminPrincipal } from '../../infrastructure/security/superadmin-jwt.strategy';

@Controller('admin/me')
@UseGuards(SuperadminAuthGuard)
export class SuperadminProfileController {
  constructor(
    private readonly getProfileUseCase: GetProfileUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly changeOwnPasswordUseCase: ChangeOwnPasswordUseCase,
  ) {}

  @Get()
  async getProfile(@CurrentSuperadmin() actor: SuperadminPrincipal) {
    try {
      return await this.getProfileUseCase.execute(actor.id);
    } catch (error) {
      throw toSuperadminHttpException(error);
    }
  }

  @Patch()
  async updateProfile(
    @CurrentSuperadmin() actor: SuperadminPrincipal,
    @Body() dto: UpdateProfileDto,
  ) {
    if (dto.name === undefined && dto.email === undefined) {
      throw new BadRequestException('At least one field must be provided');
    }

    try {
      return await this.updateProfileUseCase.execute({
        actorId: actor.id,
        name: dto.name,
        email: dto.email,
      });
    } catch (error) {
      throw toSuperadminHttpException(error);
    }
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentSuperadmin() actor: SuperadminPrincipal,
    @Body() dto: ChangePasswordDto,
  ) {
    try {
      return await this.changeOwnPasswordUseCase.execute({
        actorId: actor.id,
        currentPassword: dto.currentPassword,
        newPassword: dto.newPassword,
      });
    } catch (error) {
      throw toSuperadminHttpException(error);
    }
  }
}
