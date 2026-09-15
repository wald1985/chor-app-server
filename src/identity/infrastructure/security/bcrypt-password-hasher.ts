import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PasswordHasher } from '../../domain/ports/password-hasher.port';

const SALT_ROUNDS = 10;

@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  hash(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, SALT_ROUNDS);
  }

  compare(plainPassword: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, passwordHash);
  }
}
