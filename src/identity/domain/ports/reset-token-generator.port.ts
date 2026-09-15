export interface GeneratedResetToken {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface ResetTokenGenerator {
  generate(): GeneratedResetToken;
  hash(rawToken: string): string;
}

export const RESET_TOKEN_GENERATOR = Symbol('RESET_TOKEN_GENERATOR');
