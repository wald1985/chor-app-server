import { Inject, Injectable } from '@nestjs/common';
import {
  IncorrectCurrentPasswordError,
  SuperadminNotFoundError,
} from '../../../domain/errors/superadmin.errors';
import { SUPERADMIN_PASSWORD_HASHER } from '../../../domain/ports/password-hasher.port';
import type { PasswordHasher } from '../../../domain/ports/password-hasher.port';
import { SUPERADMIN_REPOSITORY } from '../../../domain/ports/superadmin-repository.port';
import type { SuperadminRepository } from '../../../domain/ports/superadmin-repository.port';
import { SUPERADMIN_TOKEN_ISSUER } from '../../../domain/ports/superadmin-token-issuer.port';
import type { SuperadminTokenIssuer } from '../../../domain/ports/superadmin-token-issuer.port';
import { Password } from '../../../domain/value-objects/password';

export interface ChangeOwnPasswordInput {
  actorId: string;
  currentPassword: string;
  newPassword: string;
}

export interface ChangeOwnPasswordResult {
  accessToken: string;
}

@Injectable()
export class ChangeOwnPasswordUseCase {
  constructor(
    @Inject(SUPERADMIN_REPOSITORY)
    private readonly superadminRepository: SuperadminRepository,
    @Inject(SUPERADMIN_PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    @Inject(SUPERADMIN_TOKEN_ISSUER)
    private readonly tokenIssuer: SuperadminTokenIssuer,
  ) {}

  async execute(
    input: ChangeOwnPasswordInput,
  ): Promise<ChangeOwnPasswordResult> {
    const superadmin = await this.superadminRepository.findById(input.actorId);
    if (!superadmin) {
      throw new SuperadminNotFoundError(input.actorId);
    }

    const currentMatches = await this.passwordHasher.compare(
      input.currentPassword,
      superadmin.passwordHash,
    );
    if (!currentMatches) {
      throw new IncorrectCurrentPasswordError();
    }

    const newPassword = new Password(input.newPassword);
    const newHash = await this.passwordHasher.hash(newPassword.value);
    const newTokenVersion = await this.superadminRepository.updatePasswordHash(
      superadmin.id,
      newHash,
    );

    const accessToken = this.tokenIssuer.issue({
      sub: superadmin.id,
      email: superadmin.email,
      tokenVersion: newTokenVersion,
    });

    return { accessToken };
  }
}
