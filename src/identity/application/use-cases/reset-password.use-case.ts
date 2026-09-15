import { Inject, Injectable } from '@nestjs/common';
import { InvalidOrExpiredResetTokenError } from '../../domain/errors/identity.errors';
import { MEMBERSHIP_REPOSITORY } from '../../domain/ports/membership-repository.port';
import type {
  CommunityMembershipView,
  MembershipRepository,
} from '../../domain/ports/membership-repository.port';
import { PASSWORD_HASHER } from '../../domain/ports/password-hasher.port';
import type { PasswordHasher } from '../../domain/ports/password-hasher.port';
import { PASSWORD_RESET_TOKEN_REPOSITORY } from '../../domain/ports/password-reset-token-repository.port';
import type { PasswordResetTokenRepository } from '../../domain/ports/password-reset-token-repository.port';
import { RESET_TOKEN_GENERATOR } from '../../domain/ports/reset-token-generator.port';
import type { ResetTokenGenerator } from '../../domain/ports/reset-token-generator.port';
import { TOKEN_ISSUER } from '../../domain/ports/token-issuer.port';
import type { TokenIssuer } from '../../domain/ports/token-issuer.port';
import { USER_REPOSITORY } from '../../domain/ports/user-repository.port';
import type { UserRepository } from '../../domain/ports/user-repository.port';

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

export interface ResetPasswordResult {
  accessToken: string;
  user: { id: string; email: string; name: string };
  memberships: CommunityMembershipView[];
}

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly membershipRepository: MembershipRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(TOKEN_ISSUER) private readonly tokenIssuer: TokenIssuer,
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY)
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
    @Inject(RESET_TOKEN_GENERATOR)
    private readonly resetTokenGenerator: ResetTokenGenerator,
  ) {}

  async execute(input: ResetPasswordInput): Promise<ResetPasswordResult> {
    const tokenHash = this.resetTokenGenerator.hash(input.token);
    const record =
      await this.passwordResetTokenRepository.findByTokenHash(tokenHash);
    if (!record || !record.isValid()) {
      throw new InvalidOrExpiredResetTokenError();
    }

    const user = await this.userRepository.findById(record.userId);
    if (!user) {
      throw new InvalidOrExpiredResetTokenError();
    }

    const newPasswordHash = await this.passwordHasher.hash(input.newPassword);
    const newTokenVersion = await this.userRepository.updatePasswordHash(
      user.id,
      newPasswordHash,
    );
    await this.passwordResetTokenRepository.markUsed(record.id);

    const memberships = await this.membershipRepository.findByUserId(user.id);
    const accessToken = this.tokenIssuer.issue({
      sub: user.id,
      email: user.email,
      tokenVersion: newTokenVersion,
    });

    return {
      accessToken,
      user: { id: user.id, email: user.email, name: user.name },
      memberships,
    };
  }
}
