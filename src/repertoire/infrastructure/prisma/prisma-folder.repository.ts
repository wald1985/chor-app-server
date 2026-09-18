import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { Folder } from '../../domain/entities/folder.entity';
import { FolderTitleConflictError } from '../../domain/errors/repertoire.errors';
import type { FolderRepository } from '../../domain/ports/folder-repository.port';

@Injectable()
export class PrismaFolderRepository implements FolderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Folder | null> {
    const record = await this.prisma.folder.findUnique({
      where: { id },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByCommunityAndTitleKey(
    communityId: string,
    titleKey: string,
  ): Promise<Folder | null> {
    const record = await this.prisma.folder.findUnique({
      where: {
        communityId_titleKey: {
          communityId,
          titleKey,
        },
      },
    });
    return record ? this.toDomain(record) : null;
  }

  async findAllByCommunity(
    communityId: string,
    options?: { includeArchived?: boolean },
  ): Promise<Folder[]> {
    const where: Prisma.FolderWhereInput = { communityId };
    if (!options?.includeArchived) {
      where.archivedAt = null;
    }
    const records = await this.prisma.folder.findMany({
      where,
      orderBy: { title: 'asc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async save(folder: Folder): Promise<void> {
    try {
      await this.prisma.folder.upsert({
        where: { id: folder.id },
        create: {
          id: folder.id,
          communityId: folder.communityId,
          title: folder.titleValue,
          titleKey: folder.titleKey,
          archivedAt: folder.archivedAt,
        },
        update: {
          title: folder.titleValue,
          titleKey: folder.titleKey,
          archivedAt: folder.archivedAt,
        },
      });
    } catch (err: unknown) {
      this.handleP2002(err, folder);
      throw err;
    }
  }

  private handleP2002(error: unknown, folder: Folder): void {
    const err = error as { code?: string };
    if (err?.code === 'P2002') {
      throw new FolderTitleConflictError(folder.communityId, folder.titleValue);
    }
  }

  private toDomain(record: {
    id: string;
    communityId: string;
    title: string;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Folder {
    return Folder.reconstitute({
      id: record.id,
      communityId: record.communityId,
      title: record.title,
      archivedAt: record.archivedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
