import { Inject, Injectable } from '@nestjs/common';
import { InvalidCredentialsError } from '../../../domain/errors/superadmin.errors';
import { SUPERADMIN_PASSWORD_HASHER } from '../../../domain/ports/password-hasher.port';
import type { PasswordHasher } from '../../../domain/ports/password-hasher.port';
import { SUPERADMIN_REPOSITORY } from '../../../domain/ports/superadmin-repository.port';
import type { SuperadminRepository } from '../../../domain/ports/superadmin-repository.port';
import { SUPERADMIN_TOKEN_ISSUER } from '../../../domain/ports/superadmin-token-issuer.port';
import type { SuperadminTokenIssuer } from '../../../domain/ports/superadmin-token-issuer.port';
import { DUMMY_HASH } from '../../../infrastructure/security/bcrypt-password-hasher';
import { toSuperadminView } from '../../views/superadmin.view';
import type { SuperadminView } from '../../views/superadmin.view';

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResult {
  accessToken: string;
  superadmin: SuperadminView;
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(SUPERADMIN_REPOSITORY)
    private readonly superadminRepository: SuperadminRepository,
    @Inject(SUPERADMIN_PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    @Inject(SUPERADMIN_TOKEN_ISSUER)
    private readonly tokenIssuer: SuperadminTokenIssuer,
  ) {}

  async execute(input: LoginInput): Promise<LoginResult> {
    const email = input.email.trim().toLowerCase();
    const superadmin = await this.superadminRepository.findByEmail(email);

    // Compare against a dummy hash when the email is unknown so that the
    // response time does not reveal whether the email exists (D11).
    const passwordMatches = await this.passwordHasher.compare(
      input.password,
      superadmin?.passwordHash ?? DUMMY_HASH,
    );
    if (!superadmin || !passwordMatches) {
      throw new InvalidCredentialsError();
    }

    const accessToken = this.tokenIssuer.issue({
      sub: superadmin.id,
      email: superadmin.email,
      tokenVersion: superadmin.tokenVersion,
    });

    return {
      accessToken,
      superadmin: toSuperadminView(superadmin, superadmin.id),
    };
  }
}
