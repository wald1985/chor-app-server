import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { User } from '../../domain/entities/user.entity';
import { UserRepository } from '../../domain/ports/user-repository.port';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { email } });
    return record ? this.toDomain(record) : null;
  }

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  private toDomain(record: {
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    createdAt: Date;
  }): User {
    return new User({
      id: record.id,
      email: record.email,
      passwordHash: record.passwordHash,
      name: record.name,
      createdAt: record.createdAt,
    });
  }
}
