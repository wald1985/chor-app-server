import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { Performance } from '../../domain/entities/performance.entity';
import type {
  ListPerformancesOptions,
  PerformanceRepository,
} from '../../domain/ports/performance-repository.port';
import { PerformanceDate } from '../../domain/value-objects/performance-date';

interface PerformanceRecord {
  id: string;
  communityId: string;
  date: Date;
  songId: string;
  pianistId: string | null;
  conductorId: string | null;
  note: string | null;
  createdAt: Date;
}

@Injectable()
export class PrismaPerformanceRepository implements PerformanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(communityId: string, id: string): Promise<Performance | null> {
    const record = await this.prisma.performance.findFirst({
      where: { id, communityId },
    });
    return record ? this.toDomain(record) : null;
  }

  async list(
    communityId: string,
    options: ListPerformancesOptions,
  ): Promise<Performance[]> {
    const where: Prisma.PerformanceWhereInput = { communityId };
    if (options.from || options.to) {
      where.date = {
        ...(options.from ? { gte: options.from.value } : {}),
        ...(options.to ? { lte: options.to.value } : {}),
      };
    }
    const records = await this.prisma.performance.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: options.limit,
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(performance: Performance): Promise<void> {
    await this.prisma.performance.create({
      data: {
        id: performance.id,
        communityId: performance.communityId,
        date: performance.date.value,
        songId: performance.songId,
        pianistId: performance.pianistId,
        conductorId: performance.conductorId,
        note: performance.note,
      },
    });
  }

  async delete(communityId: string, id: string): Promise<boolean> {
    const result = await this.prisma.performance.deleteMany({
      where: { id, communityId },
    });
    return result.count > 0;
  }

  private toDomain(record: PerformanceRecord): Performance {
    return Performance.reconstitute({
      id: record.id,
      communityId: record.communityId,
      date: PerformanceDate.fromDate(record.date),
      songId: record.songId,
      pianistId: record.pianistId,
      conductorId: record.conductorId,
      note: record.note,
      createdAt: record.createdAt,
    });
  }
}
