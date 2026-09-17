import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { LibraryBook } from '../../domain/entities/library-book.entity';
import {
  BookTitleTakenError,
  VolumeTakenError,
} from '../../domain/errors/library.errors';
import type { BookRepository } from '../../domain/ports/book-repository.port';
import { PrismaTransactionContext } from './prisma-transaction-context';

@Injectable()
export class PrismaBookRepository implements BookRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly txContext: PrismaTransactionContext,
  ) {}

  private get client(): PrismaService | Prisma.TransactionClient {
    return this.txContext.getClient() ?? this.prisma;
  }

  async findById(id: string): Promise<LibraryBook | null> {
    const record = await this.client.libraryBook.findUnique({
      where: { id },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByTitleKey(titleKey: string): Promise<LibraryBook | null> {
    const record = await this.client.libraryBook.findUnique({
      where: { titleKey },
    });
    return record ? this.toDomain(record) : null;
  }

  async findBySeriesAndVolume(
    seriesId: string,
    volume: number,
  ): Promise<LibraryBook | null> {
    const record = await this.client.libraryBook.findUnique({
      where: { seriesId_volume: { seriesId, volume } },
    });
    return record ? this.toDomain(record) : null;
  }

  async findAll(options?: {
    seriesId?: string;
    search?: string;
    includeArchived?: boolean;
  }): Promise<LibraryBook[]> {
    const where: Prisma.LibraryBookWhereInput = {};
    if (!options?.includeArchived) {
      where.archivedAt = null;
    }
    if (options?.seriesId !== undefined) {
      where.seriesId = options.seriesId;
    }
    if (options?.search) {
      where.title = { contains: options.search, mode: 'insensitive' };
    }
    const records = await this.client.libraryBook.findMany({
      where,
      orderBy: [{ seriesId: 'asc' }, { volume: 'asc' }, { title: 'asc' }],
    });
    return records.map((r) => this.toDomain(r));
  }

  async findByIds(ids: string[]): Promise<LibraryBook[]> {
    if (ids.length === 0) {
      return [];
    }
    const records = await this.client.libraryBook.findMany({
      where: { id: { in: ids } },
    });
    return records.map((r) => this.toDomain(r));
  }

  async countActiveBySeriesId(seriesId: string): Promise<number> {
    return await this.client.libraryBook.count({
      where: { seriesId, archivedAt: null },
    });
  }

  async findActiveIdsBySeriesId(seriesId: string): Promise<string[]> {
    const records = await this.client.libraryBook.findMany({
      where: { seriesId, archivedAt: null },
      select: { id: true },
    });
    return records.map((r) => r.id);
  }

  async create(book: LibraryBook): Promise<void> {
    try {
      await this.client.libraryBook.create({
        data: this.toPersistence(book),
      });
    } catch (err: unknown) {
      await this.handleP2002(err, book);
      throw err;
    }
  }

  async save(book: LibraryBook): Promise<void> {
    try {
      await this.client.libraryBook.update({
        where: { id: book.id },
        data: {
          title: book.title.value,
          titleKey: book.titleKey,
          seriesId: book.seriesId,
          volume: book.volumeValue,
          archivedAt: book.archivedAt,
        },
      });
    } catch (err: unknown) {
      await this.handleP2002(err, book);
      throw err;
    }
  }

  private async handleP2002(error: unknown, book: LibraryBook): Promise<void> {
    const err = error as { code?: string };
    if (err?.code !== 'P2002') {
      return;
    }

    if (book.seriesId && book.volumeValue !== null) {
      const byVolume = await this.client.libraryBook.findUnique({
        where: {
          seriesId_volume: {
            seriesId: book.seriesId,
            volume: book.volumeValue,
          },
        },
      });
      if (byVolume && byVolume.id !== book.id) {
        throw new VolumeTakenError(byVolume.id);
      }
    }

    const byTitle = await this.client.libraryBook.findUnique({
      where: { titleKey: book.titleKey },
    });
    if (byTitle) {
      throw new BookTitleTakenError(byTitle.id, byTitle.archivedAt !== null);
    }
  }

  private toDomain(record: {
    id: string;
    title: string;
    seriesId: string | null;
    volume: number | null;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): LibraryBook {
    return LibraryBook.create({
      id: record.id,
      title: record.title,
      placement: {
        seriesId: record.seriesId,
        volume: record.volume,
      },
      archivedAt: record.archivedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  private toPersistence(book: LibraryBook): {
    id: string;
    title: string;
    titleKey: string;
    seriesId: string | null;
    volume: number | null;
    archivedAt: Date | null;
  } {
    return {
      id: book.id,
      title: book.title.value,
      titleKey: book.titleKey,
      seriesId: book.seriesId,
      volume: book.volumeValue,
      archivedAt: book.archivedAt,
    };
  }
}
