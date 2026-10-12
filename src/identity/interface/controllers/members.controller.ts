import {
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ListCommunityMembersUseCase } from '../../application/use-cases/list-community-members.use-case';
import { SetMemberPermissionsUseCase } from '../../application/use-cases/set-member-permissions.use-case';
import {
  AdministratorPermissionsImmutableError,
  MembershipNotFoundError,
} from '../../domain/errors/identity.errors';
import { CommunityRole } from '../../domain/value-objects/community-role';
import { RequireRole } from '../decorators/require-permission.decorator';
import { SetMemberPermissionsDto } from '../dto/set-member-permissions.dto';
import { CommunityMemberGuard } from '../guards/community-member.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('communities/:communityId/members')
@UseGuards(JwtAuthGuard, CommunityMemberGuard)
@RequireRole(CommunityRole.ADMINISTRATOR)
export class MembersController {
  constructor(
    private readonly listCommunityMembersUseCase: ListCommunityMembersUseCase,
    private readonly setMemberPermissionsUseCase: SetMemberPermissionsUseCase,
  ) {}

  @Get()
  list(@Param('communityId', ParseUUIDPipe) communityId: string) {
    return this.listCommunityMembersUseCase.execute(communityId);
  }

  @Put(':membershipId/permissions')
  async setPermissions(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @Body() dto: SetMemberPermissionsDto,
  ) {
    try {
      return await this.setMemberPermissionsUseCase.execute({
        communityId,
        membershipId,
        permissions: dto.permissions,
      });
    } catch (error) {
      if (error instanceof MembershipNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof AdministratorPermissionsImmutableError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }
}
