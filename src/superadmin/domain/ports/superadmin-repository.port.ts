import { Superadmin } from '../entities/superadmin.entity';

export interface SuperadminRepository {
  findById(id: string): Promise<Superadmin | null>;
  findByEmail(email: string): Promise<Superadmin | null>;
  list(): Promise<Superadmin[]>;
  create(superadmin: Superadmin): Promise<void>;
  save(superadmin: Superadmin): Promise<void>;
  /** Updates the password hash and bumps `tokenVersion`, returning the new value so callers can issue a fresh token. */
  updatePasswordHash(id: string, passwordHash: string): Promise<number>;
  /** Deletes `id` unless it is the last remaining superadmin, atomically. */
  deleteKeepingAtLeastOne(id: string): Promise<void>;
}

export const SUPERADMIN_REPOSITORY = Symbol('SUPERADMIN_REPOSITORY');
