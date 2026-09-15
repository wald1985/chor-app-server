import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { Community } from '../../domain/entities/community.entity';
import { CommunityMembership } from '../../domain/entities/community-membership.entity';
import { User } from '../../domain/entities/user.entity';
import {
  RegisterCommunityAdministratorInput,
  RegisterCommunityAdministratorResult,
  RegistrationRepository,
} from '../../domain/ports/registration-repository.port';
import { CommunityRole } from '../../domain/value-objects/community-role';

@Injectable()
export class PrismaRegistrationRepository implements RegistrationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async registerCommunityAdministrator(
    input: RegisterCommunityAdministratorInput,
  ): Promise<RegisterCommunityAdministratorResult> {
    const result = await this.prisma.$transaction(async (tx) => {
      const community = await tx.community.create({
        data: { name: input.communityName },
      });

      const user = await tx.user.create({
        data: {
          email: input.userEmail,
          name: input.userName,
          passwordHash: input.passwordHash,
        },
      });

      const membership = await tx.communityMembership.create({
        data: {
          userId: user.id,
          communityId: community.id,
          role: CommunityRole.ADMINISTRATOR,
        },
      });

      return { community, user, membership };
    });

    return {
      community: new Community({
        id: result.community.id,
        name: result.community.name,
        createdAt: result.community.createdAt,
      }),
      user: new User({
        id: result.user.id,
        email: result.user.email,
        passwordHash: result.user.passwordHash,
        name: result.user.name,
        createdAt: result.user.createdAt,
      }),
      membership: new CommunityMembership({
        id: result.membership.id,
        userId: result.membership.userId,
        communityId: result.membership.communityId,
        role: result.membership.role as unknown as CommunityRole,
        createdAt: result.membership.createdAt,
      }),
    };
  }
}
