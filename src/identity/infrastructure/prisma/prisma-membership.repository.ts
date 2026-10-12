import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { CommunityMembership } from '../../domain/entities/community-membership.entity';
import {
  CommunityMemberView,
  CommunityMembershipView,
  MembershipRepository,
} from '../../domain/ports/membership-repository.port';
import { CommunityPermission } from '../../domain/value-objects/community-permission';
import { CommunityRole } from '../../domain/value-objects/community-role';

@Injectable()
export class PrismaMembershipRepository implements MembershipRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<CommunityMembershipView[]> {
    const records = await this.prisma.communityMembership.findMany({
      where: { userId },
      include: { community: true },
    });

    return records.map((record) => {
      const membership = new CommunityMembership({
        id: record.id,
        userId: record.userId,
        communityId: record.communityId,
        role: record.role as unknown as CommunityRole,
        permissions: record.permissions as unknown as CommunityPermission[],
        createdAt: record.createdAt,
      });

      return {
        communityId: record.communityId,
        communityName: record.community.name,
        role: record.role as unknown as CommunityRole,
        permissions: membership.effectivePermissions(),
      };
    });
  }

  async findByUserAndCommunity(
    userId: string,
    communityId: string,
  ): Promise<CommunityMembership | null> {
    const record = await this.prisma.communityMembership.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId,
        },
      },
    });

    if (!record) {
      return null;
    }

    return new CommunityMembership({
      id: record.id,
      userId: record.userId,
      communityId: record.communityId,
      role: record.role as unknown as CommunityRole,
      permissions: record.permissions as unknown as CommunityPermission[],
      createdAt: record.createdAt,
    });
  }

  async findById(id: string): Promise<CommunityMembership | null> {
    const record = await this.prisma.communityMembership.findUnique({
      where: { id },
    });

    if (!record) {
      return null;
    }

    return new CommunityMembership({
      id: record.id,
      userId: record.userId,
      communityId: record.communityId,
      role: record.role as unknown as CommunityRole,
      permissions: record.permissions as unknown as CommunityPermission[],
      createdAt: record.createdAt,
    });
  }

  async listByCommunityWithUsers(
    communityId: string,
  ): Promise<CommunityMemberView[]> {
    const records = await this.prisma.communityMembership.findMany({
      where: { communityId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });

    return records.map((record) => {
      const membership = new CommunityMembership({
        id: record.id,
        userId: record.userId,
        communityId: record.communityId,
        role: record.role as unknown as CommunityRole,
        permissions: record.permissions as unknown as CommunityPermission[],
        createdAt: record.createdAt,
      });

      return {
        membershipId: record.id,
        userId: record.userId,
        name: record.user.name,
        email: record.user.email,
        role: membership.role,
        permissions: membership.effectivePermissions(),
      };
    });
  }

  async save(membership: CommunityMembership): Promise<void> {
    await this.prisma.communityMembership.update({
      where: { id: membership.id },
      data: { permissions: membership.permissions },
    });
  }
}
