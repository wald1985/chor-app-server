import { Inject, Injectable } from '@nestjs/common';
import { SuperadminNotFoundError } from '../../../domain/errors/superadmin.errors';
import { SUPERADMIN_PASSWORD_HASHER } from '../../../domain/ports/password-hasher.port';
import type { PasswordHasher } from '../../../domain/ports/password-hasher.port';
import { SUPERADMIN_REPOSITORY } from '../../../domain/ports/superadmin-repository.port';
import type { SuperadminRepository } from '../../../domain/ports/superadmin-repository.port';
import { Password } from '../../../domain/value-objects/password';

export interface SetSuperadminPasswordInput {
  id: string;
  newPassword: string;
}

@Injectable()
export class SetSuperadminPasswordUseCase {
  constructor(
    @Inject(SUPERADMIN_REPOSITORY)
    private readonly superadminRepository: SuperadminRepository,
    @Inject(SUPERADMIN_PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(
    input: SetSuperadminPasswordInput,
    actorId: string,
  ): Promise<void> {
    const superadmin = await this.superadminRepository.findById(input.id);
    if (!superadmin) {
      throw new SuperadminNotFoundError(input.id);
    }
    superadmin.assertPasswordSettableBy(actorId);

    const password = new Password(input.newPassword);
    const passwordHash = await this.passwordHasher.hash(password.value);
    await this.superadminRepository.updatePasswordHash(
      superadmin.id,
      passwordHash,
    );
  }
}
