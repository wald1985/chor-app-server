import { Inject, Injectable } from '@nestjs/common';
import { InvalidCredentialsError } from '../../domain/errors/identity.errors';
import { MEMBERSHIP_REPOSITORY } from '../../domain/ports/membership-repository.port';
import type {
  CommunityMembershipView,
  MembershipRepository,
} from '../../domain/ports/membership-repository.port';
import { PASSWORD_HASHER } from '../../domain/ports/password-hasher.port';
import type { PasswordHasher } from '../../domain/ports/password-hasher.port';
import { TOKEN_ISSUER } from '../../domain/ports/token-issuer.port';
import type { TokenIssuer } from '../../domain/ports/token-issuer.port';
import { USER_REPOSITORY } from '../../domain/ports/user-repository.port';
import type { UserRepository } from '../../domain/ports/user-repository.port';

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResult {
  accessToken: string;
  user: { id: string; email: string; name: string };
  memberships: CommunityMembershipView[];
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly membershipRepository: MembershipRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(TOKEN_ISSUER) private readonly tokenIssuer: TokenIssuer,
  ) {}

  async execute(input: LoginInput): Promise<LoginResult> {
    const email = input.email.trim().toLowerCase();
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    const passwordMatches = await this.passwordHasher.compare(
      input.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }

    const memberships = await this.membershipRepository.findByUserId(user.id);
    const accessToken = this.tokenIssuer.issue({
      sub: user.id,
      email: user.email,
      tokenVersion: user.tokenVersion,
    });

    return {
      accessToken,
      user: { id: user.id, email: user.email, name: user.name },
      memberships,
    };
  }
}
