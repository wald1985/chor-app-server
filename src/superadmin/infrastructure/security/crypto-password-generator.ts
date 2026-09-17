import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PasswordGenerator } from '../../domain/ports/password-generator.port';

@Injectable()
export class CryptoPasswordGenerator implements PasswordGenerator {
  generate(length: number): string {
    // base64url encodes 3 bytes as 4 characters; round up so the result is
    // at least `length` characters, then trim to exactly `length`.
    const bytes = Math.ceil((length * 3) / 4);
    return randomBytes(bytes).toString('base64url').slice(0, length);
  }
}
