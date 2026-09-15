import { Inject, Injectable } from '@nestjs/common';
import { MEMBERSHIP_REPOSITORY } from '../../domain/ports/membership-repository.port';
import type {
  CommunityMembershipView,
  MembershipRepository,
} from '../../domain/ports/membership-repository.port';
import { USER_REPOSITORY } from '../../domain/ports/user-repository.port';
import type { UserRepository } from '../../domain/ports/user-repository.port';

export interface CurrentUserResult {
  user: { id: string; email: string; name: string };
  memberships: CommunityMembershipView[];
}

@Injectable()
export class GetCurrentUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(userId: string): Promise<CurrentUserResult | null> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return null;
    }

    const memberships = await this.membershipRepository.findByUserId(userId);

    return {
      user: { id: user.id, email: user.email, name: user.name },
      memberships,
    };
  }
}
