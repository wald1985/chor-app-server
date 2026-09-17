export interface PasswordHasher {
  hash(plainPassword: string): Promise<string>;
  compare(plainPassword: string, passwordHash: string): Promise<boolean>;
}

export const SUPERADMIN_PASSWORD_HASHER = Symbol('SUPERADMIN_PASSWORD_HASHER');
