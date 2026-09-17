import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { LibrarySong } from '../../domain/entities/library-song.entity';
import { SongNumberTakenError } from '../../domain/errors/library.errors';
import type { SongRepository } from '../../domain/ports/song-repository.port';
import { PrismaTransactionContext } from './prisma-transaction-context';

type SongWithThemesRecord = {
  id: string;
  bookId: string;
  numberScopeId: string;
  number: string;
  numberKey: string;
  sortKey: string;
  title: string;
  author: string | null;
  arranger: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  themes?: { themeId: string }[];
};

@Injectable()
export class PrismaSongRepository implements SongRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly txContext: PrismaTransactionContext,
  ) {}

  private get client(): PrismaService | Prisma.TransactionClient {
    return this.txContext.getClient() ?? this.prisma;
  }

  async findById(id: string): Promise<LibrarySong | null> {
    const record = await this.client.librarySong.findUnique({
      where: { id },
      include: { themes: { select: { themeId: true } } },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByScope(
    numberScopeId: string,
    numberKey: string,
  ): Promise<LibrarySong | null> {
    const record = await this.client.librarySong.findUnique({
      where: {
        numberScopeId_numberKey: {
          numberScopeId,
          numberKey,
        },
      },
      include: { themes: { select: { themeId: true } } },
    });
    return record ? this.toDomain(record) : null;
  }

  async listByBookIds(
    bookIds: string[],
    options?: { includeArchived?: boolean },
  ): Promise<LibrarySong[]> {
    if (bookIds.length === 0) {
      return [];
    }
    const where: Prisma.LibrarySongWhereInput = {
      bookId: { in: bookIds },
    };
    if (!options?.includeArchived) {
      where.archivedAt = null;
    }
    const records = await this.client.librarySong.findMany({
      where,
      include: { themes: { select: { themeId: true } } },
      orderBy: { sortKey: 'asc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findByIds(ids: string[]): Promise<LibrarySong[]> {
    if (ids.length === 0) {
      return [];
    }
    const records = await this.client.librarySong.findMany({
      where: { id: { in: ids } },
      include: { themes: { select: { themeId: true } } },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findNumberKeys(numberScopeId: string): Promise<string[]> {
    const records = await this.client.librarySong.findMany({
      where: { numberScopeId },
      select: { numberKey: true },
    });
    return records.map((r) => r.numberKey);
  }

  async create(song: LibrarySong): Promise<void> {
    try {
      await this.client.librarySong.create({
        data: {
          ...this.toPersistence(song),
          themes: {
            create: song.themeIds.map((themeId) => ({ themeId })),
          },
        },
      });
    } catch (err: unknown) {
      await this.handleP2002(err, song);
      throw err;
    }
  }

  async save(song: LibrarySong): Promise<void> {
    try {
      await this.client.librarySong.update({
        where: { id: song.id },
        data: this.toPersistence(song),
      });
      await this.client.librarySongTheme.deleteMany({
        where: { songId: song.id },
      });
      if (song.themeIds.length > 0) {
        await this.client.librarySongTheme.createMany({
          data: song.themeIds.map((themeId) => ({
            songId: song.id,
            themeId,
          })),
        });
      }
    } catch (err: unknown) {
      await this.handleP2002(err, song);
      throw err;
    }
  }

  async saveMany(songs: LibrarySong[]): Promise<void> {
    for (const song of songs) {
      await this.save(song);
    }
  }

  async createMany(songs: LibrarySong[]): Promise<void> {
    if (songs.length === 0) {
      return;
    }
    try {
      await this.client.librarySong.createMany({
        data: songs.map((s) => this.toPersistence(s)),
      });
      const songThemes = songs.flatMap((s) =>
        s.themeIds.map((themeId) => ({ songId: s.id, themeId })),
      );
      if (songThemes.length > 0) {
        await this.client.librarySongTheme.createMany({
          data: songThemes,
        });
      }
    } catch (err: unknown) {
      await this.handleBatchP2002(err, songs);
      throw err;
    }
  }

  async rescope(bookId: string, newScopeId: string): Promise<void> {
    await this.client.librarySong.updateMany({
      where: { bookId },
      data: { numberScopeId: newScopeId },
    });
  }

  async countActiveSongsByTheme(): Promise<Map<string, number>> {
    const counts = await this.client.librarySongTheme.groupBy({
      by: ['themeId'],
      where: { song: { archivedAt: null } },
      _count: { songId: true },
    });
    const map = new Map<string, number>();
    for (const item of counts) {
      map.set(item.themeId, item._count.songId);
    }
    return map;
  }

  private async handleP2002(error: unknown, song: LibrarySong): Promise<void> {
    const err = error as { code?: string };
    if (err?.code !== 'P2002') {
      return;
    }
    const existing = await this.client.librarySong.findUnique({
      where: {
        numberScopeId_numberKey: {
          numberScopeId: song.numberScopeId,
          numberKey: song.numberKey,
        },
      },
    });
    throw new SongNumberTakenError(
      existing?.id,
      existing?.bookId,
      existing ? existing.archivedAt !== null : false,
    );
  }

  private async handleBatchP2002(
    error: unknown,
    songs: LibrarySong[],
  ): Promise<void> {
    const err = error as { code?: string };
    if (err?.code !== 'P2002') {
      return;
    }
    for (const song of songs) {
      const existing = await this.client.librarySong.findUnique({
        where: {
          numberScopeId_numberKey: {
            numberScopeId: song.numberScopeId,
            numberKey: song.numberKey,
          },
        },
      });
      if (existing) {
        throw new SongNumberTakenError(
          existing.id,
          existing.bookId,
          existing.archivedAt !== null,
        );
      }
    }
  }

  private toDomain(record: SongWithThemesRecord): LibrarySong {
    return LibrarySong.reconstitute({
      id: record.id,
      bookId: record.bookId,
      numberScopeId: record.numberScopeId,
      number: record.number,
      title: record.title,
      author: record.author,
      arranger: record.arranger,
      themeIds: record.themes ? record.themes.map((t) => t.themeId) : [],
      archivedAt: record.archivedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  private toPersistence(song: LibrarySong): {
    id: string;
    bookId: string;
    numberScopeId: string;
    number: string;
    numberKey: string;
    sortKey: string;
    title: string;
    author: string | null;
    arranger: string | null;
    archivedAt: Date | null;
  } {
    return {
      id: song.id,
      bookId: song.bookId,
      numberScopeId: song.numberScopeId,
      number: song.numberValue,
      numberKey: song.numberKey,
      sortKey: song.sortKey,
      title: song.titleValue,
      author: song.authorValue,
      arranger: song.arrangerValue,
      archivedAt: song.archivedAt,
    };
  }
}
