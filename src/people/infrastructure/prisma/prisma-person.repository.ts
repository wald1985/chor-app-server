import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { Person } from '../../domain/entities/person.entity';
import { PersonNameTakenError } from '../../domain/errors/people.errors';
import type {
  ListPeopleOptions,
  PersonRepository,
} from '../../domain/ports/person-repository.port';

interface PersonRecord {
  id: string;
  communityId: string;
  name: string;
  roles: string[];
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PrismaPersonRepository implements PersonRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(communityId: string, id: string): Promise<Person | null> {
    const record = await this.prisma.person.findFirst({
      where: { id, communityId },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByNameKey(
    communityId: string,
    nameKey: string,
  ): Promise<Person | null> {
    const record = await this.prisma.person.findUnique({
      where: { communityId_nameKey: { communityId, nameKey } },
    });
    return record ? this.toDomain(record) : null;
  }

  async list(
    communityId: string,
    options?: ListPeopleOptions,
  ): Promise<Person[]> {
    const where: Prisma.PersonWhereInput = { communityId };
    if (!options?.includeArchived) {
      where.archivedAt = null;
    }
    if (options?.role) {
      where.roles = { has: options.role };
    }
    const records = await this.prisma.person.findMany({
      where,
      orderBy: { nameKey: 'asc' },
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(person: Person): Promise<void> {
    const data = {
      name: person.nameValue,
      nameKey: person.nameKey,
      roles: [...person.roles],
      archivedAt: person.archivedAt,
    };
    try {
      await this.prisma.person.upsert({
        where: { id: person.id },
        create: { id: person.id, communityId: person.communityId, ...data },
        update: data,
      });
    } catch (error: unknown) {
      if ((error as { code?: string })?.code === 'P2002') {
        await this.throwNameTaken(person);
      }
      throw error;
    }
  }

  /** Lost a race against the unique constraint: report who holds the name. */
  private async throwNameTaken(person: Person): Promise<never> {
    const existing = await this.findByNameKey(
      person.communityId,
      person.nameKey,
    );
    throw new PersonNameTakenError(
      person.nameValue,
      existing?.id ?? '',
      existing?.isArchived ?? false,
    );
  }

  private toDomain(record: PersonRecord): Person {
    return Person.reconstitute({
      id: record.id,
      communityId: record.communityId,
      name: record.name,
      roles: record.roles,
      archivedAt: record.archivedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
