import { Inject, Injectable } from '@nestjs/common';
import { MEMBERSHIP_REPOSITORY } from '../../domain/ports/membership-repository.port';
import type {
  CommunityMemberView,
  MembershipRepository,
} from '../../domain/ports/membership-repository.port';

@Injectable()
export class ListCommunityMembersUseCase {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly membershipRepository: MembershipRepository,
  ) {}

  execute(communityId: string): Promise<CommunityMemberView[]> {
    return this.membershipRepository.listByCommunityWithUsers(communityId);
  }
}
