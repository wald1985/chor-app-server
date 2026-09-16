import { CommunityMembership } from '../entities/community-membership.entity';
import { CommunityRole } from '../value-objects/community-role';

export interface CommunityMembershipView {
  communityId: string;
  communityName: string;
  role: CommunityRole;
}

export interface MembershipRepository {
  findByUserId(userId: string): Promise<CommunityMembershipView[]>;
  findByUserAndCommunity(
    userId: string,
    communityId: string,
  ): Promise<CommunityMembership | null>;
}

export const MEMBERSHIP_REPOSITORY = Symbol('MEMBERSHIP_REPOSITORY');
