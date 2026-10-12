import { Inject, Injectable } from '@nestjs/common';
import { Person } from '../../domain/entities/person.entity';
import { PersonNotFoundError } from '../../domain/errors/people.errors';
import { PERSON_REPOSITORY } from '../../domain/ports/person-repository.port';
import type { PersonRepository } from '../../domain/ports/person-repository.port';
import type { PersonCommand } from './archive-person.use-case';

@Injectable()
export class GetPersonUseCase {
  constructor(
    @Inject(PERSON_REPOSITORY)
    private readonly personRepo: PersonRepository,
  ) {}

  async execute(query: PersonCommand): Promise<Person> {
    const person = await this.personRepo.findById(
      query.communityId,
      query.personId,
    );
    if (!person) {
      throw new PersonNotFoundError(query.personId);
    }
    return person;
  }
}
