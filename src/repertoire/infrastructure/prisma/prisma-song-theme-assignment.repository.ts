import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { SongThemeAssignment } from '../../domain/entities/song-theme-assignment.entity';
import type { SongThemeAssignmentRepository } from '../../domain/ports/song-theme-assignment-repository.port';
import { ThemeSource } from '../../domain/value-objects/theme-source';

@Injectable()
export class PrismaSongThemeAssignmentRepository implements SongThemeAssignmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByCommunityId(communityId: string): Promise<SongThemeAssignment[]> {
    const records = await this.prisma.songThemeAssignment.findMany({
      where: { communityId },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findByCommunityAndSongId(
    communityId: string,
    songId: string,
  ): Promise<SongThemeAssignment[]> {
    const records = await this.prisma.songThemeAssignment.findMany({
      where: { communityId, songId },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findByCommunityAndSongIds(
    communityId: string,
    songIds: string[],
  ): Promise<SongThemeAssignment[]> {
    if (songIds.length === 0) {
      return [];
    }
    const records = await this.prisma.songThemeAssignment.findMany({
      where: { communityId, songId: { in: songIds } },
    });
    return records.map((r) => this.toDomain(r));
  }

  async setSongThemes(
    communityId: string,
    songId: string,
    assignments: Array<{ themeSource: ThemeSource; themeId: string }>,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.songThemeAssignment.deleteMany({
        where: { communityId, songId },
      });
      if (assignments.length > 0) {
        await tx.songThemeAssignment.createMany({
          data: assignments.map((a) => ({
            communityId,
            songId,
            themeSource: a.themeSource,
            themeId: a.themeId,
          })),
        });
      }
    });
  }

  private toDomain(record: {
    communityId: string;
    songId: string;
    themeSource: string;
    themeId: string;
    createdAt: Date;
  }): SongThemeAssignment {
    return SongThemeAssignment.create({
      communityId: record.communityId,
      songId: record.songId,
      themeSource: record.themeSource as ThemeSource,
      themeId: record.themeId,
      createdAt: record.createdAt,
    });
  }
}
