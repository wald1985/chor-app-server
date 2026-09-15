import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  CommunityMembershipView,
  MembershipRepository,
} from '../../domain/ports/membership-repository.port';
import { CommunityRole } from '../../domain/value-objects/community-role';

@Injectable()
export class PrismaMembershipRepository implements MembershipRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<CommunityMembershipView[]> {
    const records = await this.prisma.communityMembership.findMany({
      where: { userId },
      include: { community: true },
    });

    return records.map((record) => ({
      communityId: record.communityId,
      communityName: record.community.name,
      role: record.role as unknown as CommunityRole,
    }));
  }
}
