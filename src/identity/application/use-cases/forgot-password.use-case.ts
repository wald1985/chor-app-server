import { Inject, Injectable } from '@nestjs/common';
import type { EmailSender } from '../../../notifications';
import { EMAIL_SENDER } from '../../../notifications';
import { PASSWORD_RESET_TOKEN_REPOSITORY } from '../../domain/ports/password-reset-token-repository.port';
import type { PasswordResetTokenRepository } from '../../domain/ports/password-reset-token-repository.port';
import { RESET_TOKEN_GENERATOR } from '../../domain/ports/reset-token-generator.port';
import type { ResetTokenGenerator } from '../../domain/ports/reset-token-generator.port';
import { USER_REPOSITORY } from '../../domain/ports/user-repository.port';
import type { UserRepository } from '../../domain/ports/user-repository.port';

export interface ForgotPasswordInput {
  email: string;
}

@Injectable()
export class ForgotPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY)
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
    @Inject(RESET_TOKEN_GENERATOR)
    private readonly resetTokenGenerator: ResetTokenGenerator,
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
  ) {}

  async execute(input: ForgotPasswordInput): Promise<void> {
    const email = input.email.trim().toLowerCase();
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Deliberately silent: don't reveal whether an email is registered.
      return;
    }

    await this.passwordResetTokenRepository.deleteAllForUser(user.id);

    const { rawToken, tokenHash, expiresAt } =
      this.resetTokenGenerator.generate();
    await this.passwordResetTokenRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const expiresAtLocal = expiresAt.toLocaleString('de-DE', {
      timeZone: 'Europe/Berlin',
    });

    await this.emailSender.send({
      to: user.email,
      subject: 'Passwort zurücksetzen – Chor-App',
      text: `Hallo ${user.name},\n\nfür dein Konto wurde eine Passwort-Zurücksetzung angefordert.\n\nDein Code: ${rawToken}\n\nDieser Code ist bis ${expiresAtLocal} Uhr gültig. Wenn du das nicht angefordert hast, kannst du diese E-Mail ignorieren.`,
    });
  }
}
