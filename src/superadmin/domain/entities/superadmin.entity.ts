import {
  CannotDeleteSelfError,
  UseChangePasswordError,
} from '../errors/superadmin.errors';
import { SuperadminEmail } from '../value-objects/superadmin-email';
import { SuperadminName } from '../value-objects/superadmin-name';

export interface SuperadminProps {
  id: string;
  email: SuperadminEmail;
  name: SuperadminName;
  passwordHash: string;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Superadmin {
  private constructor(private readonly props: SuperadminProps) {}

  static create(props: {
    id: string;
    email: SuperadminEmail | string;
    name: SuperadminName | string;
    passwordHash: string;
    tokenVersion?: number;
    createdAt?: Date;
    updatedAt?: Date;
  }): Superadmin {
    const now = new Date();
    return new Superadmin({
      id: props.id,
      email:
        props.email instanceof SuperadminEmail
          ? props.email
          : new SuperadminEmail(props.email),
      name:
        props.name instanceof SuperadminName
          ? props.name
          : new SuperadminName(props.name),
      passwordHash: props.passwordHash,
      tokenVersion: props.tokenVersion ?? 0,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get email(): string {
    return this.props.email.value;
  }

  get name(): string {
    return this.props.name.value;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get tokenVersion(): number {
    return this.props.tokenVersion;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  rename(name: SuperadminName | string): void {
    this.props.name =
      name instanceof SuperadminName ? name : new SuperadminName(name);
  }

  changeEmail(email: SuperadminEmail | string): void {
    this.props.email =
      email instanceof SuperadminEmail ? email : new SuperadminEmail(email);
  }

  assertDeletableBy(actorId: string): void {
    if (this.props.id === actorId) {
      throw new CannotDeleteSelfError();
    }
  }

  assertPasswordSettableBy(actorId: string): void {
    if (this.props.id === actorId) {
      throw new UseChangePasswordError();
    }
  }
}
