import { Inject, Injectable } from '@nestjs/common';
import { PERSON_LOOKUP, type PersonLookup } from '../../../people';
import type {
  PersonReference,
  PersonResolver,
} from '../../domain/ports/person-resolver.port';

/** Adapts People's exported `PersonLookup` port to this module's `PersonResolver`. */
@Injectable()
export class PeoplePersonResolver implements PersonResolver {
  constructor(@Inject(PERSON_LOOKUP) private readonly lookup: PersonLookup) {}

  async findMany(
    communityId: string,
    ids: string[],
  ): Promise<PersonReference[]> {
    const people = await this.lookup.findMany(communityId, ids);
    return people.map((person) => ({
      id: person.id,
      name: person.name,
      roles: person.roles,
      archived: person.archived,
    }));
  }
}
