import { Inject, Injectable } from '@nestjs/common';
import { IncorrectCurrentPasswordError } from '../../domain/errors/identity.errors';
import { PASSWORD_HASHER } from '../../domain/ports/password-hasher.port';
import type { PasswordHasher } from '../../domain/ports/password-hasher.port';
import { PASSWORD_RESET_TOKEN_REPOSITORY } from '../../domain/ports/password-reset-token-repository.port';
import type { PasswordResetTokenRepository } from '../../domain/ports/password-reset-token-repository.port';
import { TOKEN_ISSUER } from '../../domain/ports/token-issuer.port';
import type { TokenIssuer } from '../../domain/ports/token-issuer.port';
import { USER_REPOSITORY } from '../../domain/ports/user-repository.port';
import type { UserRepository } from '../../domain/ports/user-repository.port';

export interface ChangePasswordInput {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResult {
  accessToken: string;
}

@Injectable()
export class ChangePasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(TOKEN_ISSUER) private readonly tokenIssuer: TokenIssuer,
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY)
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
  ) {}

  async execute(input: ChangePasswordInput): Promise<ChangePasswordResult> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new IncorrectCurrentPasswordError();
    }

    const currentPasswordMatches = await this.passwordHasher.compare(
      input.currentPassword,
      user.passwordHash,
    );
    if (!currentPasswordMatches) {
      throw new IncorrectCurrentPasswordError();
    }

    const newPasswordHash = await this.passwordHasher.hash(input.newPassword);
    const newTokenVersion = await this.userRepository.updatePasswordHash(
      user.id,
      newPasswordHash,
    );
    await this.passwordResetTokenRepository.deleteAllForUser(user.id);

    const accessToken = this.tokenIssuer.issue({
      sub: user.id,
      email: user.email,
      tokenVersion: newTokenVersion,
    });

    return { accessToken };
  }
}
