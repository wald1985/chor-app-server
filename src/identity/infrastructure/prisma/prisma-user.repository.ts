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

  async updatePasswordHash(
    userId: string,
    passwordHash: string,
  ): Promise<number> {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    });
    return updated.tokenVersion;
  }

  private toDomain(record: {
    id: string;
    email: string;
    passwordHash: string;
    tokenVersion: number;
    name: string;
    createdAt: Date;
  }): User {
    return new User({
      id: record.id,
      email: record.email,
      passwordHash: record.passwordHash,
      tokenVersion: record.tokenVersion,
      name: record.name,
      createdAt: record.createdAt,
    });
  }
}
