import { Inject, Injectable } from '@nestjs/common';
import { EmailAlreadyRegisteredError } from '../../domain/errors/identity.errors';
import { PASSWORD_HASHER } from '../../domain/ports/password-hasher.port';
import type { PasswordHasher } from '../../domain/ports/password-hasher.port';
import { REGISTRATION_REPOSITORY } from '../../domain/ports/registration-repository.port';
import type { RegistrationRepository } from '../../domain/ports/registration-repository.port';
import { USER_REPOSITORY } from '../../domain/ports/user-repository.port';
import type { UserRepository } from '../../domain/ports/user-repository.port';
import { CommunityRole } from '../../domain/value-objects/community-role';

export interface RegisterInput {
  communityName: string;
  name: string;
  email: string;
  password: string;
}

export interface RegisterResult {
  userId: string;
  communityId: string;
  communityName: string;
  role: CommunityRole;
}

@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(REGISTRATION_REPOSITORY)
    private readonly registrationRepository: RegistrationRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: RegisterInput): Promise<RegisterResult> {
    const email = input.email.trim().toLowerCase();

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new EmailAlreadyRegisteredError(email);
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    const { community, user, membership } =
      await this.registrationRepository.registerCommunityAdministrator({
        communityName: input.communityName.trim(),
        userEmail: email,
        userName: input.name.trim(),
        passwordHash,
      });

    return {
      userId: user.id,
      communityId: community.id,
      communityName: community.name,
      role: membership.role,
    };
  }
}
