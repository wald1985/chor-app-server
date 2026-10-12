import {
  PersonRolesEmptyError,
  PersonValueInvalidError,
} from '../errors/people.errors';
import { ALL_PERSON_ROLES, PersonRole } from './person-role';

/** Non-empty, deduplicated set of roles. */
export class PersonRoles {
  readonly values: readonly PersonRole[];

  constructor(raw: readonly string[]) {
    if (!Array.isArray(raw)) {
      throw new PersonValueInvalidError('roles');
    }
    const unique = Array.from(new Set(raw));
    if (unique.length === 0) {
      throw new PersonRolesEmptyError();
    }
    for (const role of unique) {
      if (!ALL_PERSON_ROLES.includes(role as PersonRole)) {
        throw new PersonValueInvalidError('roles');
      }
    }
    this.values = Object.freeze(unique as PersonRole[]);
  }

  has(role: PersonRole): boolean {
    return this.values.includes(role);
  }
}
