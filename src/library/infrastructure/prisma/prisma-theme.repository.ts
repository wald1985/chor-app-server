import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { LibraryTheme } from '../../domain/entities/library-theme.entity';
import { ThemeNameTakenError } from '../../domain/errors/library.errors';
import type { ThemeRepository } from '../../domain/ports/theme-repository.port';
import { PrismaTransactionContext } from './prisma-transaction-context';

@Injectable()
export class PrismaThemeRepository implements ThemeRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly txContext: PrismaTransactionContext,
  ) {}

  private get client(): PrismaService | Prisma.TransactionClient {
    return this.txContext.getClient() ?? this.prisma;
  }

  async findById(id: string): Promise<LibraryTheme | null> {
    const record = await this.client.libraryTheme.findUnique({
      where: { id },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByNameKey(nameKey: string): Promise<LibraryTheme | null> {
    const record = await this.client.libraryTheme.findUnique({
      where: { nameKey },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByIds(ids: string[]): Promise<LibraryTheme[]> {
    if (ids.length === 0) {
      return [];
    }
    const records = await this.client.libraryTheme.findMany({
      where: { id: { in: ids } },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findAll(options?: {
    includeArchived?: boolean;
  }): Promise<LibraryTheme[]> {
    const where: Prisma.LibraryThemeWhereInput = options?.includeArchived
      ? {}
      : { archivedAt: null };
    const records = await this.client.libraryTheme.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async create(theme: LibraryTheme): Promise<void> {
    try {
      await this.client.libraryTheme.create({
        data: this.toPersistence(theme),
      });
    } catch (err: unknown) {
      await this.handleP2002(err, theme.nameKey);
      throw err;
    }
  }

  async save(theme: LibraryTheme): Promise<void> {
    try {
      await this.client.libraryTheme.update({
        where: { id: theme.id },
        data: {
          name: theme.name.value,
          nameKey: theme.nameKey,
          archivedAt: theme.archivedAt,
        },
      });
    } catch (err: unknown) {
      await this.handleP2002(err, theme.nameKey);
      throw err;
    }
  }

  async createMany(themes: LibraryTheme[]): Promise<void> {
    if (themes.length === 0) {
      return;
    }
    try {
      await this.client.libraryTheme.createMany({
        data: themes.map((t) => this.toPersistence(t)),
      });
    } catch (err: unknown) {
      await this.handleBatchP2002(err, themes);
      throw err;
    }
  }

  private async handleBatchP2002(
    error: unknown,
    themes: LibraryTheme[],
  ): Promise<void> {
    const err = error as { code?: string };
    if (err?.code !== 'P2002') {
      return;
    }
    for (const theme of themes) {
      const existing = await this.client.libraryTheme.findUnique({
        where: { nameKey: theme.nameKey },
      });
      if (existing) {
        throw new ThemeNameTakenError(
          existing.id,
          existing.archivedAt !== null,
        );
      }
    }
  }

  private async handleP2002(error: unknown, nameKey: string): Promise<void> {
    const err = error as { code?: string };
    if (err?.code === 'P2002') {
      const existing = await this.client.libraryTheme.findUnique({
        where: { nameKey },
      });
      throw new ThemeNameTakenError(
        existing?.id,
        existing ? existing.archivedAt !== null : false,
      );
    }
  }

  private toDomain(record: {
    id: string;
    name: string;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): LibraryTheme {
    return LibraryTheme.create({
      id: record.id,
      name: record.name,
      archivedAt: record.archivedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  private toPersistence(theme: LibraryTheme): {
    id: string;
    name: string;
    nameKey: string;
    archivedAt: Date | null;
  } {
    return {
      id: theme.id,
      name: theme.name.value,
      nameKey: theme.nameKey,
      archivedAt: theme.archivedAt,
    };
  }
}
