import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { RehearsalEntry } from '../../domain/entities/rehearsal-entry.entity';
import { Rehearsal } from '../../domain/entities/rehearsal.entity';
import {
  RehearsalDateTakenError,
  RehearsalNotFoundError,
} from '../../domain/errors/rehearsal-log.errors';
import type {
  DeleteRehearsalOutcome,
  RehearsalRepository,
  RehearsalWithCount,
} from '../../domain/ports/rehearsal-repository.port';
import { RehearsalDate } from '../../domain/value-objects/rehearsal-date';

interface RehearsalRecord {
  id: string;
  communityId: string;
  date: Date;
  warmUpLeaderId: string | null;
  note: string | null;
  createdAt: Date;
}

interface EntryRecord {
  id: string;
  rehearsalId: string;
  songId: string;
  pianistId: string | null;
  conductorId: string | null;
  note: string | null;
  createdAt: Date;
}

const errorCode = (error: unknown): string | undefined =>
  (error as { code?: string } | null)?.code;

@Injectable()
export class PrismaRehearsalRepository implements RehearsalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(communityId: string, id: string): Promise<Rehearsal | null> {
    const record = await this.prisma.rehearsal.findFirst({
      where: { id, communityId },
    });
    return record ? this.toRehearsal(record) : null;
  }

  async findByDate(
    communityId: string,
    date: RehearsalDate,
  ): Promise<Rehearsal | null> {
    const record = await this.prisma.rehearsal.findUnique({
      where: { communityId_date: { communityId, date: date.value } },
    });
    return record ? this.toRehearsal(record) : null;
  }

  async list(
    communityId: string,
    range: { from?: RehearsalDate; to?: RehearsalDate },
  ): Promise<RehearsalWithCount[]> {
    const where: Prisma.RehearsalWhereInput = { communityId };
    if (range.from || range.to) {
      where.date = {
        ...(range.from ? { gte: range.from.value } : {}),
        ...(range.to ? { lte: range.to.value } : {}),
      };
    }
    const records = await this.prisma.rehearsal.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { _count: { select: { entries: true } } },
    });
    return records.map((record) => ({
      rehearsal: this.toRehearsal(record),
      entryCount: record._count.entries,
    }));
  }

  async save(rehearsal: Rehearsal): Promise<void> {
    const data = {
      date: rehearsal.date.value,
      warmUpLeaderId: rehearsal.warmUpLeaderId,
      note: rehearsal.note,
    };
    try {
      await this.prisma.rehearsal.upsert({
        where: { id: rehearsal.id },
        create: {
          id: rehearsal.id,
          communityId: rehearsal.communityId,
          ...data,
        },
        update: data,
      });
    } catch (error: unknown) {
      if (errorCode(error) === 'P2002') {
        await this.throwDateTaken(rehearsal);
      }
      throw error;
    }
  }

  async deleteIfEmpty(
    communityId: string,
    id: string,
  ): Promise<DeleteRehearsalOutcome> {
    const result = await this.prisma.rehearsal.deleteMany({
      where: { id, communityId, entries: { none: {} } },
    });
    if (result.count > 0) {
      return 'deleted';
    }
    const exists = await this.prisma.rehearsal.findFirst({
      where: { id, communityId },
      select: { id: true },
    });
    return exists ? 'not_empty' : 'not_found';
  }

  async listEntries(rehearsalId: string): Promise<RehearsalEntry[]> {
    const records = await this.prisma.rehearsalEntry.findMany({
      where: { rehearsalId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return records.map((record) => this.toEntry(record));
  }

  async addEntry(entry: RehearsalEntry): Promise<void> {
    try {
      await this.prisma.rehearsalEntry.create({
        data: {
          id: entry.id,
          rehearsalId: entry.rehearsalId,
          songId: entry.songId,
          pianistId: entry.pianistId,
          conductorId: entry.conductorId,
          note: entry.note,
        },
      });
    } catch (error: unknown) {
      // The rehearsal was deleted between the check and the insert.
      if (errorCode(error) === 'P2003') {
        throw new RehearsalNotFoundError(entry.rehearsalId);
      }
      throw error;
    }
  }

  async removeEntry(rehearsalId: string, entryId: string): Promise<boolean> {
    const result = await this.prisma.rehearsalEntry.deleteMany({
      where: { id: entryId, rehearsalId },
    });
    return result.count > 0;
  }

  /** Lost a race against the unique (community, date) constraint. */
  private async throwDateTaken(rehearsal: Rehearsal): Promise<never> {
    const existing = await this.findByDate(
      rehearsal.communityId,
      rehearsal.date,
    );
    throw new RehearsalDateTakenError(rehearsal.date.iso, existing?.id ?? '');
  }

  private toRehearsal(record: RehearsalRecord): Rehearsal {
    return Rehearsal.reconstitute({
      id: record.id,
      communityId: record.communityId,
      date: RehearsalDate.fromDate(record.date),
      warmUpLeaderId: record.warmUpLeaderId,
      note: record.note,
      createdAt: record.createdAt,
    });
  }

  private toEntry(record: EntryRecord): RehearsalEntry {
    return RehearsalEntry.reconstitute({
      id: record.id,
      rehearsalId: record.rehearsalId,
      songId: record.songId,
      pianistId: record.pianistId,
      conductorId: record.conductorId,
      note: record.note,
      createdAt: record.createdAt,
    });
  }
}
