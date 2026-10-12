import { Person } from '../entities/person.entity';
import { PersonRole } from '../value-objects/person-role';

export const PERSON_REPOSITORY = Symbol('PERSON_REPOSITORY');

export interface ListPeopleOptions {
  role?: PersonRole;
  includeArchived?: boolean;
}

export interface PersonRepository {
  findById(communityId: string, id: string): Promise<Person | null>;
  findByIds(communityId: string, ids: string[]): Promise<Person[]>;
  findByNameKey(communityId: string, nameKey: string): Promise<Person | null>;
  list(communityId: string, options?: ListPeopleOptions): Promise<Person[]>;
  save(person: Person): Promise<void>;
}
