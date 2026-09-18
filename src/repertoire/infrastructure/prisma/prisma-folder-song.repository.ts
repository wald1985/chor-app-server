import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { FolderSong } from '../../domain/entities/folder-song.entity';
import { FolderSongNumberConflictError } from '../../domain/errors/repertoire.errors';
import type { FolderSongRepository } from '../../domain/ports/folder-song-repository.port';

@Injectable()
export class PrismaFolderSongRepository implements FolderSongRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<FolderSong | null> {
    const record = await this.prisma.folderSong.findUnique({
      where: { id },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByFolderAndNumberKey(
    folderId: string,
    numberKey: string,
  ): Promise<FolderSong | null> {
    const record = await this.prisma.folderSong.findUnique({
      where: {
        folderId_numberKey: {
          folderId,
          numberKey,
        },
      },
    });
    return record ? this.toDomain(record) : null;
  }

  async findAllByFolder(
    folderId: string,
    options?: { includeArchived?: boolean },
  ): Promise<FolderSong[]> {
    const where: Prisma.FolderSongWhereInput = { folderId };
    if (!options?.includeArchived) {
      where.archivedAt = null;
    }
    const records = await this.prisma.folderSong.findMany({
      where,
      orderBy: { sortKey: 'asc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findAllByCommunity(
    communityId: string,
    options?: { includeArchived?: boolean },
  ): Promise<FolderSong[]> {
    const where: Prisma.FolderSongWhereInput = { communityId };
    if (!options?.includeArchived) {
      where.archivedAt = null;
    }
    const records = await this.prisma.folderSong.findMany({
      where,
      orderBy: [{ folderId: 'asc' }, { sortKey: 'asc' }],
    });
    return records.map((r) => this.toDomain(r));
  }

  async save(song: FolderSong): Promise<void> {
    try {
      await this.prisma.folderSong.upsert({
        where: { id: song.id },
        create: {
          id: song.id,
          communityId: song.communityId,
          folderId: song.folderId,
          number: song.numberValue,
          numberKey: song.numberKey,
          sortKey: song.sortKey,
          title: song.titleValue,
          author: song.authorValue,
          arranger: song.arrangerValue,
          isNew: song.isNew,
          archivedAt: song.archivedAt,
        },
        update: {
          number: song.numberValue,
          numberKey: song.numberKey,
          sortKey: song.sortKey,
          title: song.titleValue,
          author: song.authorValue,
          arranger: song.arrangerValue,
          isNew: song.isNew,
          archivedAt: song.archivedAt,
        },
      });
    } catch (err: unknown) {
      this.handleP2002(err, song);
      throw err;
    }
  }

  private handleP2002(error: unknown, song: FolderSong): void {
    const err = error as { code?: string };
    if (err?.code === 'P2002') {
      throw new FolderSongNumberConflictError(song.folderId, song.numberValue);
    }
  }

  private toDomain(record: {
    id: string;
    communityId: string;
    folderId: string;
    number: string;
    title: string;
    author: string | null;
    arranger: string | null;
    isNew: boolean;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): FolderSong {
    return FolderSong.reconstitute({
      id: record.id,
      communityId: record.communityId,
      folderId: record.folderId,
      number: record.number,
      title: record.title,
      author: record.author,
      arranger: record.arranger,
      isNew: record.isNew,
      archivedAt: record.archivedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
