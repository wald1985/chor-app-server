export interface PasswordGenerator {
  /** Returns a random password string of (at least) `length` characters. */
  generate(length: number): string;
}

export const PASSWORD_GENERATOR = Symbol('SUPERADMIN_PASSWORD_GENERATOR');
