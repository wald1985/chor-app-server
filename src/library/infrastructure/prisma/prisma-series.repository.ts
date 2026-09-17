import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { LibrarySeries } from '../../domain/entities/library-series.entity';
import { SeriesTitleTakenError } from '../../domain/errors/library.errors';
import { SeriesRepository } from '../../domain/ports/series-repository.port';
import { PrismaTransactionContext } from './prisma-transaction-context';

@Injectable()
export class PrismaSeriesRepository implements SeriesRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly txContext: PrismaTransactionContext,
  ) {}

  private get client(): PrismaService | Prisma.TransactionClient {
    return this.txContext.getClient() ?? this.prisma;
  }

  async findById(id: string): Promise<LibrarySeries | null> {
    const record = await this.client.librarySeries.findUnique({
      where: { id },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByTitleKey(titleKey: string): Promise<LibrarySeries | null> {
    const record = await this.client.librarySeries.findUnique({
      where: { titleKey },
    });
    return record ? this.toDomain(record) : null;
  }

  async findAll(options?: {
    includeArchived?: boolean;
  }): Promise<LibrarySeries[]> {
    const where: Prisma.LibrarySeriesWhereInput = options?.includeArchived
      ? {}
      : { archivedAt: null };
    const records = await this.client.librarySeries.findMany({
      where,
      orderBy: { title: 'asc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async create(series: LibrarySeries): Promise<void> {
    try {
      await this.client.librarySeries.create({
        data: this.toPersistence(series),
      });
    } catch (err: unknown) {
      await this.handleP2002(err, series.titleKey);
      throw err;
    }
  }

  async save(series: LibrarySeries): Promise<void> {
    try {
      await this.client.librarySeries.update({
        where: { id: series.id },
        data: {
          title: series.title.value,
          titleKey: series.titleKey,
          archivedAt: series.archivedAt,
        },
      });
    } catch (err: unknown) {
      await this.handleP2002(err, series.titleKey);
      throw err;
    }
  }

  private async handleP2002(error: unknown, titleKey: string): Promise<void> {
    const err = error as { code?: string };
    if (err?.code === 'P2002') {
      const existing = await this.client.librarySeries.findUnique({
        where: { titleKey },
      });
      throw new SeriesTitleTakenError(
        existing?.id,
        existing ? existing.archivedAt !== null : false,
      );
    }
  }

  private toDomain(record: {
    id: string;
    title: string;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): LibrarySeries {
    return LibrarySeries.create({
      id: record.id,
      title: record.title,
      archivedAt: record.archivedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  private toPersistence(series: LibrarySeries): {
    id: string;
    title: string;
    titleKey: string;
    archivedAt: Date | null;
  } {
    return {
      id: series.id,
      title: series.title.value,
      titleKey: series.titleKey,
      archivedAt: series.archivedAt,
    };
  }
}
