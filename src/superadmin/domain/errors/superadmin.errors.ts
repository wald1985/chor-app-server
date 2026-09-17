export class InvalidSuperadminValueError extends Error {
  readonly field: string;

  constructor(field: string) {
    super(`Invalid value for ${field}`);
    this.name = 'InvalidSuperadminValueError';
    this.field = field;
  }
}

export class SuperadminNotFoundError extends Error {
  readonly id: string;

  constructor(id: string) {
    super(`Superadmin not found: ${id}`);
    this.name = 'SuperadminNotFoundError';
    this.id = id;
  }
}

export class SuperadminEmailTakenError extends Error {
  readonly existingId: string;

  constructor(email: string, existingId: string) {
    super(`Email already taken: ${email}`);
    this.name = 'SuperadminEmailTakenError';
    this.existingId = existingId;
  }
}

export class CannotDeleteSelfError extends Error {
  constructor() {
    super('Superadmin cannot delete themselves');
    this.name = 'CannotDeleteSelfError';
  }
}

export class UseChangePasswordError extends Error {
  constructor() {
    super('Use the change-password endpoint to set your own password');
    this.name = 'UseChangePasswordError';
  }
}

export class LastSuperadminError extends Error {
  constructor() {
    super('Cannot delete the last remaining superadmin');
    this.name = 'LastSuperadminError';
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid email or password');
    this.name = 'InvalidCredentialsError';
  }
}

export class IncorrectCurrentPasswordError extends Error {
  constructor() {
    super('Current password is incorrect');
    this.name = 'IncorrectCurrentPasswordError';
  }
}

export class SuperadminExistsError extends Error {
  readonly email: string;

  constructor(email: string) {
    super(`Superadmin already exists: ${email}`);
    this.name = 'SuperadminExistsError';
    this.email = email;
  }
}
