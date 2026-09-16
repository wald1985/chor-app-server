import { Controller, Get, Module, UseGuards } from '@nestjs/common';
import { IdentityModule } from '../../src/identity/identity.module';
import {
  CommunityContext,
  CurrentMembership,
} from '../../src/identity/interface/decorators/current-membership.decorator';
import { CommunityMemberGuard } from '../../src/identity/interface/guards/community-member.guard';
import { JwtAuthGuard } from '../../src/identity/interface/guards/jwt-auth.guard';

@Controller('communities/:communityId/test-access')
@UseGuards(JwtAuthGuard, CommunityMemberGuard)
export class TestCommunityController {
  @Get()
  checkAccess(@CurrentMembership() membership: CommunityContext) {
    return {
      status: 'ok',
      communityId: membership.communityId,
      membershipId: membership.membershipId,
      role: membership.role,
      permissions: membership.permissions,
    };
  }
}

@Module({
  imports: [IdentityModule],
  controllers: [TestCommunityController],
})
export class TestCommunityModule {}
