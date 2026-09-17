import { Injectable } from '@nestjs/common';
import { Superadmin } from '../../domain/entities/superadmin.entity';
import {
  LastSuperadminError,
  SuperadminEmailTakenError,
  SuperadminNotFoundError,
} from '../../domain/errors/superadmin.errors';
import type { SuperadminRepository } from '../../domain/ports/superadmin-repository.port';
import { PrismaService } from '../../../shared/prisma/prisma.service';

const SUPERADMIN_DELETE_ADVISORY_LOCK_ID = 391847205613029n;

interface SuperadminRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PrismaSuperadminRepository implements SuperadminRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Superadmin | null> {
    const record = await this.prisma.superadmin.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findByEmail(email: string): Promise<Superadmin | null> {
    const record = await this.prisma.superadmin.findUnique({
      where: { email },
    });
    return record ? this.toDomain(record) : null;
  }

  async list(): Promise<Superadmin[]> {
    const records = await this.prisma.superadmin.findMany({
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
    });
    return records.map((r) => this.toDomain(r));
  }

  async create(superadmin: Superadmin): Promise<void> {
    try {
      await this.prisma.superadmin.create({
        data: {
          id: superadmin.id,
          email: superadmin.email,
          name: superadmin.name,
          passwordHash: superadmin.passwordHash,
          tokenVersion: superadmin.tokenVersion,
        },
      });
    } catch (err: unknown) {
      await this.handleEmailTaken(err, superadmin.email);
      throw err;
    }
  }

  async save(superadmin: Superadmin): Promise<void> {
    try {
      await this.prisma.superadmin.update({
        where: { id: superadmin.id },
        data: {
          email: superadmin.email,
          name: superadmin.name,
        },
      });
    } catch (err: unknown) {
      await this.handleEmailTaken(err, superadmin.email);
      throw err;
    }
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<number> {
    const updated = await this.prisma.superadmin.update({
      where: { id },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    });
    return updated.tokenVersion;
  }

  async deleteKeepingAtLeastOne(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SELECT pg_advisory_xact_lock(${SUPERADMIN_DELETE_ADVISORY_LOCK_ID});`,
      );

      const existing = await tx.superadmin.findUnique({ where: { id } });
      if (!existing) {
        throw new SuperadminNotFoundError(id);
      }

      const count = await tx.superadmin.count();
      if (count <= 1) {
        throw new LastSuperadminError();
      }

      await tx.superadmin.delete({ where: { id } });
    });
  }

  private async handleEmailTaken(error: unknown, email: string): Promise<void> {
    const err = error as { code?: string };
    if (err?.code === 'P2002') {
      const existing = await this.prisma.superadmin.findUnique({
        where: { email },
      });
      throw new SuperadminEmailTakenError(email, existing?.id ?? '');
    }
  }

  private toDomain(record: SuperadminRecord): Superadmin {
    return Superadmin.create({
      id: record.id,
      email: record.email,
      name: record.name,
      passwordHash: record.passwordHash,
      tokenVersion: record.tokenVersion,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
