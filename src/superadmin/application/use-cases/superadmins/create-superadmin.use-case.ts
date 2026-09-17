import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { Superadmin } from '../../../domain/entities/superadmin.entity';
import { SUPERADMIN_PASSWORD_HASHER } from '../../../domain/ports/password-hasher.port';
import type { PasswordHasher } from '../../../domain/ports/password-hasher.port';
import { SUPERADMIN_REPOSITORY } from '../../../domain/ports/superadmin-repository.port';
import type { SuperadminRepository } from '../../../domain/ports/superadmin-repository.port';
import { Password } from '../../../domain/value-objects/password';
import { toSuperadminView } from '../../views/superadmin.view';
import type { SuperadminView } from '../../views/superadmin.view';

export interface CreateSuperadminInput {
  email: string;
  name: string;
  password: string;
}

@Injectable()
export class CreateSuperadminUseCase {
  constructor(
    @Inject(SUPERADMIN_REPOSITORY)
    private readonly superadminRepository: SuperadminRepository,
    @Inject(SUPERADMIN_PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(
    input: CreateSuperadminInput,
    actorId: string,
  ): Promise<SuperadminView> {
    const password = new Password(input.password);
    const passwordHash = await this.passwordHasher.hash(password.value);

    const superadmin = Superadmin.create({
      id: randomUUID(),
      email: input.email,
      name: input.name,
      passwordHash,
    });

    await this.superadminRepository.create(superadmin);
    return toSuperadminView(superadmin, actorId);
  }
}
