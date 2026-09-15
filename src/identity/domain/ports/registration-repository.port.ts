import { Community } from '../entities/community.entity';
import { CommunityMembership } from '../entities/community-membership.entity';
import { User } from '../entities/user.entity';

export interface RegisterCommunityAdministratorInput {
  communityName: string;
  userEmail: string;
  userName: string;
  passwordHash: string;
}

export interface RegisterCommunityAdministratorResult {
  community: Community;
  user: User;
  membership: CommunityMembership;
}

export interface RegistrationRepository {
  registerCommunityAdministrator(
    input: RegisterCommunityAdministratorInput,
  ): Promise<RegisterCommunityAdministratorResult>;
}

export const REGISTRATION_REPOSITORY = Symbol('REGISTRATION_REPOSITORY');
