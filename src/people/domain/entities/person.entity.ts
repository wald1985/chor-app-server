import { randomUUID } from 'node:crypto';
import { PersonArchivedError } from '../errors/people.errors';
import { PersonName } from '../value-objects/person-name';
import { PersonRole } from '../value-objects/person-role';
import { PersonRoles } from '../value-objects/person-roles';

export interface PersonProps {
  id: string;
  communityId: string;
  name: PersonName;
  roles: PersonRoles;
  archivedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PersonInit {
  id?: string;
  communityId: string;
  name: PersonName | string;
  roles: PersonRoles | readonly string[];
  archivedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Person {
  private constructor(private readonly props: PersonProps) {}

  static create(init: PersonInit): Person {
    return Person.build({ ...init, id: init.id ?? randomUUID() });
  }

  static reconstitute(init: PersonInit & { id: string }): Person {
    return Person.build(init);
  }

  private static build(init: PersonInit & { id: string }): Person {
    return new Person({
      id: init.id,
      communityId: init.communityId,
      name:
        init.name instanceof PersonName ? init.name : new PersonName(init.name),
      roles:
        init.roles instanceof PersonRoles
          ? init.roles
          : new PersonRoles(init.roles),
      archivedAt: init.archivedAt ?? null,
      createdAt: init.createdAt,
      updatedAt: init.updatedAt,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get communityId(): string {
    return this.props.communityId;
  }

  get name(): PersonName {
    return this.props.name;
  }

  get nameValue(): string {
    return this.props.name.value;
  }

  get nameKey(): string {
    return this.props.name.key;
  }

  get roles(): readonly PersonRole[] {
    return this.props.roles.values;
  }

  get archivedAt(): Date | null {
    return this.props.archivedAt;
  }

  get isArchived(): boolean {
    return this.props.archivedAt !== null;
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  get updatedAt(): Date | undefined {
    return this.props.updatedAt;
  }

  hasRole(role: PersonRole): boolean {
    return this.props.roles.has(role);
  }

  rename(name: PersonName | string): void {
    this.assertNotArchived();
    this.props.name = name instanceof PersonName ? name : new PersonName(name);
  }

  changeRoles(roles: PersonRoles | readonly string[]): void {
    this.assertNotArchived();
    this.props.roles =
      roles instanceof PersonRoles ? roles : new PersonRoles(roles);
  }

  archive(now: Date): void {
    if (this.isArchived) {
      return;
    }
    this.props.archivedAt = now;
  }

  restore(): void {
    this.props.archivedAt = null;
  }

  private assertNotArchived(): void {
    if (this.isArchived) {
      throw new PersonArchivedError(this.id);
    }
  }
}
