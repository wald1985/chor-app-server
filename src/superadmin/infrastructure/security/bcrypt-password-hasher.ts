import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PasswordHasher } from '../../domain/ports/password-hasher.port';

const SALT_ROUNDS = 10;

/**
 * Precomputed bcrypt hash of a random string, compared against on login when
 * the given email is unknown so the response time does not reveal whether
 * the email exists (D11).
 */
export const DUMMY_HASH =
  '$2b$10$4OiTEBwKH1WHfyfchNszQ.loQHaZKs6zpkokPavHNhgCzRCEVYCBi';

@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  hash(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, SALT_ROUNDS);
  }

  compare(plainPassword: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, passwordHash);
  }
}
