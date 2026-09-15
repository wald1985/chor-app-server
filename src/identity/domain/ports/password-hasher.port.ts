export interface PasswordHasher {
  hash(plainPassword: string): Promise<string>;
  compare(plainPassword: string, passwordHash: string): Promise<boolean>;
}

export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');
