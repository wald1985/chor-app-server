import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { Theme } from '../../domain/entities/theme.entity';
import { ThemeNameConflictError } from '../../domain/errors/repertoire.errors';
import type { ThemeRepository } from '../../domain/ports/theme-repository.port';

@Injectable()
export class PrismaThemeRepository implements ThemeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Theme | null> {
    const record = await this.prisma.theme.findUnique({
      where: { id },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByIds(ids: string[]): Promise<Theme[]> {
    if (ids.length === 0) {
      return [];
    }
    const records = await this.prisma.theme.findMany({
      where: { id: { in: ids } },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findByCommunityAndNameKey(
    communityId: string,
    nameKey: string,
  ): Promise<Theme | null> {
    const record = await this.prisma.theme.findUnique({
      where: {
        communityId_nameKey: {
          communityId,
          nameKey,
        },
      },
    });
    return record ? this.toDomain(record) : null;
  }

  async findAllByCommunity(
    communityId: string,
    options?: { includeArchived?: boolean },
  ): Promise<Theme[]> {
    const where: Prisma.ThemeWhereInput = { communityId };
    if (!options?.includeArchived) {
      where.archivedAt = null;
    }
    const records = await this.prisma.theme.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async save(theme: Theme): Promise<void> {
    try {
      await this.prisma.theme.upsert({
        where: { id: theme.id },
        create: {
          id: theme.id,
          communityId: theme.communityId,
          name: theme.nameValue,
          nameKey: theme.nameKey,
          archivedAt: theme.archivedAt,
        },
        update: {
          name: theme.nameValue,
          nameKey: theme.nameKey,
          archivedAt: theme.archivedAt,
        },
      });
    } catch (err: unknown) {
      this.handleP2002(err, theme);
      throw err;
    }
  }

  private handleP2002(error: unknown, theme: Theme): void {
    const err = error as { code?: string };
    if (err?.code === 'P2002') {
      throw new ThemeNameConflictError(theme.communityId, theme.nameValue);
    }
  }

  private toDomain(record: {
    id: string;
    communityId: string;
    name: string;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Theme {
    return Theme.reconstitute({
      id: record.id,
      communityId: record.communityId,
      name: record.name,
      archivedAt: record.archivedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
