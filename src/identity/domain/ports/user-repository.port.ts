import { User } from '../entities/user.entity';

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  /** Updates the password hash and bumps `tokenVersion`, returning the new value so callers can issue a fresh token. */
  updatePasswordHash(userId: string, passwordHash: string): Promise<number>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
