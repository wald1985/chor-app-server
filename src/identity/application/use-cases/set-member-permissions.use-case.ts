import { Inject, Injectable } from '@nestjs/common';
import { MembershipNotFoundError } from '../../domain/errors/identity.errors';
import { MEMBERSHIP_REPOSITORY } from '../../domain/ports/membership-repository.port';
import type { MembershipRepository } from '../../domain/ports/membership-repository.port';
import { CommunityPermission } from '../../domain/value-objects/community-permission';

export interface SetMemberPermissionsInput {
  communityId: string;
  membershipId: string;
  permissions: CommunityPermission[];
}

export interface SetMemberPermissionsResult {
  membershipId: string;
  permissions: CommunityPermission[];
}

@Injectable()
export class SetMemberPermissionsUseCase {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(
    input: SetMemberPermissionsInput,
  ): Promise<SetMemberPermissionsResult> {
    const membership = await this.membershipRepository.findById(
      input.membershipId,
    );

    if (!membership || membership.communityId !== input.communityId) {
      throw new MembershipNotFoundError(input.membershipId);
    }

    membership.setPermissions(input.permissions);
    await this.membershipRepository.save(membership);

    return {
      membershipId: membership.id,
      permissions: membership.effectivePermissions(),
    };
  }
}
