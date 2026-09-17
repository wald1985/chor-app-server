export class EmailAlreadyRegisteredError extends Error {
  constructor(email: string) {
    super(`Email already registered: ${email}`);
    this.name = 'EmailAlreadyRegisteredError';
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

export class InvalidOrExpiredResetTokenError extends Error {
  constructor() {
    super('Password reset token is invalid or expired');
    this.name = 'InvalidOrExpiredResetTokenError';
  }
}

export class AdministratorPermissionsImmutableError extends Error {
  constructor() {
    super('Administrator permissions cannot be modified');
    this.name = 'AdministratorPermissionsImmutableError';
  }
}

export class NotCommunityMemberError extends Error {
  constructor() {
    super('Not a member of this community');
    this.name = 'NotCommunityMemberError';
  }
}

export class MembershipNotFoundError extends Error {
  constructor(membershipId?: string) {
    super(
      membershipId
        ? `Membership not found: ${membershipId}`
        : 'Membership not found',
    );
    this.name = 'MembershipNotFoundError';
  }
}
