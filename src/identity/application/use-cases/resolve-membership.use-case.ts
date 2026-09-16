import { Inject, Injectable } from '@nestjs/common';
import { CommunityMembership } from '../../domain/entities/community-membership.entity';
import { NotCommunityMemberError } from '../../domain/errors/identity.errors';
import { MEMBERSHIP_REPOSITORY } from '../../domain/ports/membership-repository.port';
import type { MembershipRepository } from '../../domain/ports/membership-repository.port';

@Injectable()
export class ResolveMembershipUseCase {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(
    userId: string,
    communityId: string,
  ): Promise<CommunityMembership> {
    const membership = await this.membershipRepository.findByUserAndCommunity(
      userId,
      communityId,
    );

    if (!membership) {
      throw new NotCommunityMemberError();
    }

    return membership;
  }
}
