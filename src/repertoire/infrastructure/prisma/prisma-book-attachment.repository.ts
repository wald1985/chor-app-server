import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { BookAttachment } from '../../domain/entities/book-attachment.entity';
import { AttachmentAlreadyExistsError } from '../../domain/errors/repertoire.errors';
import type { BookAttachmentRepository } from '../../domain/ports/book-attachment-repository.port';

@Injectable()
export class PrismaBookAttachmentRepository implements BookAttachmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<BookAttachment | null> {
    const record = await this.prisma.bookAttachment.findUnique({
      where: { id },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByCommunityAndLibraryBookId(
    communityId: string,
    libraryBookId: string,
  ): Promise<BookAttachment | null> {
    const record = await this.prisma.bookAttachment.findUnique({
      where: {
        communityId_libraryBookId: {
          communityId,
          libraryBookId,
        },
      },
    });
    return record ? this.toDomain(record) : null;
  }

  async findAllByCommunity(
    communityId: string,
    options?: { includeArchived?: boolean },
  ): Promise<BookAttachment[]> {
    const where: Prisma.BookAttachmentWhereInput = { communityId };
    if (!options?.includeArchived) {
      where.archivedAt = null;
    }
    const records = await this.prisma.bookAttachment.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async save(attachment: BookAttachment): Promise<void> {
    try {
      await this.prisma.bookAttachment.upsert({
        where: { id: attachment.id },
        create: {
          id: attachment.id,
          communityId: attachment.communityId,
          libraryBookId: attachment.libraryBookId,
          archivedAt: attachment.archivedAt,
        },
        update: {
          archivedAt: attachment.archivedAt,
        },
      });
    } catch (err: unknown) {
      this.handleP2002(err, attachment);
      throw err;
    }
  }

  async delete(id: string): Promise<void> {
    await this.prisma.bookAttachment.delete({
      where: { id },
    });
  }

  private handleP2002(error: unknown, attachment: BookAttachment): void {
    const err = error as { code?: string };
    if (err?.code === 'P2002') {
      throw new AttachmentAlreadyExistsError(
        attachment.communityId,
        attachment.libraryBookId,
      );
    }
  }

  private toDomain(record: {
    id: string;
    communityId: string;
    libraryBookId: string;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): BookAttachment {
    return BookAttachment.reconstitute({
      id: record.id,
      communityId: record.communityId,
      libraryBookId: record.libraryBookId,
      archivedAt: record.archivedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
