import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import {
  GeneratedResetToken,
  ResetTokenGenerator,
} from '../../domain/ports/reset-token-generator.port';

const RAW_TOKEN_BYTES = 32;

@Injectable()
export class CryptoResetTokenGenerator implements ResetTokenGenerator {
  private readonly ttlMinutes: number;

  constructor(configService: ConfigService) {
    this.ttlMinutes = Number(
      configService.get<string>('PASSWORD_RESET_TOKEN_TTL_MINUTES', '60'),
    );
  }

  generate(): GeneratedResetToken {
    const rawToken = randomBytes(RAW_TOKEN_BYTES).toString('hex');
    const expiresAt = new Date(Date.now() + this.ttlMinutes * 60_000);
    return { rawToken, tokenHash: this.hash(rawToken), expiresAt };
  }

  hash(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }
}
