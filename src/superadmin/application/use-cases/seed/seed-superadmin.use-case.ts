import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { Superadmin } from '../../../domain/entities/superadmin.entity';
import {
  SuperadminExistsError,
  SuperadminNotFoundError,
} from '../../../domain/errors/superadmin.errors';
import { PASSWORD_GENERATOR } from '../../../domain/ports/password-generator.port';
import type { PasswordGenerator } from '../../../domain/ports/password-generator.port';
import { SUPERADMIN_PASSWORD_HASHER } from '../../../domain/ports/password-hasher.port';
import type { PasswordHasher } from '../../../domain/ports/password-hasher.port';
import { SUPERADMIN_REPOSITORY } from '../../../domain/ports/superadmin-repository.port';
import type { SuperadminRepository } from '../../../domain/ports/superadmin-repository.port';

const GENERATED_PASSWORD_LENGTH = 24;

export interface SeedSuperadminInput {
  email: string;
  name?: string;
  resetPassword: boolean;
}

export type SeedSuperadminAction = 'CREATED' | 'PASSWORD_RESET';

export interface SeedSuperadminResult {
  email: string;
  password: string;
  action: SeedSuperadminAction;
}

@Injectable()
export class SeedSuperadminUseCase {
  constructor(
    @Inject(SUPERADMIN_REPOSITORY)
    private readonly superadminRepository: SuperadminRepository,
    @Inject(SUPERADMIN_PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    @Inject(PASSWORD_GENERATOR)
    private readonly passwordGenerator: PasswordGenerator,
  ) {}

  async execute(input: SeedSuperadminInput): Promise<SeedSuperadminResult> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.superadminRepository.findByEmail(email);

    if (input.resetPassword) {
      return this.resetPassword(email, existing);
    }
    return this.create(email, input.name, existing);
  }

  private async create(
    email: string,
    name: string | undefined,
    existing: Superadmin | null,
  ): Promise<SeedSuperadminResult> {
    if (existing) {
      throw new SuperadminExistsError(email);
    }

    const password = this.passwordGenerator.generate(GENERATED_PASSWORD_LENGTH);
    const passwordHash = await this.passwordHasher.hash(password);
    const superadmin = Superadmin.create({
      id: randomUUID(),
      email,
      name: name ?? '',
      passwordHash,
    });
    await this.superadminRepository.create(superadmin);

    return { email, password, action: 'CREATED' };
  }

  private async resetPassword(
    email: string,
    existing: Superadmin | null,
  ): Promise<SeedSuperadminResult> {
    if (!existing) {
      throw new SuperadminNotFoundError(email);
    }

    const password = this.passwordGenerator.generate(GENERATED_PASSWORD_LENGTH);
    const passwordHash = await this.passwordHasher.hash(password);
    await this.superadminRepository.updatePasswordHash(
      existing.id,
      passwordHash,
    );

    return { email, password, action: 'PASSWORD_RESET' };
  }
}
