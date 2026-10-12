import { Inject, Injectable } from '@nestjs/common';
import { Person } from '../../domain/entities/person.entity';
import { PersonNotFoundError } from '../../domain/errors/people.errors';
import { PERSON_REPOSITORY } from '../../domain/ports/person-repository.port';
import type { PersonRepository } from '../../domain/ports/person-repository.port';
import type { PersonCommand } from './archive-person.use-case';

/** Idempotent: restoring an active Person returns it unchanged. */
@Injectable()
export class RestorePersonUseCase {
  constructor(
    @Inject(PERSON_REPOSITORY)
    private readonly personRepo: PersonRepository,
  ) {}

  async execute(command: PersonCommand): Promise<Person> {
    const person = await this.personRepo.findById(
      command.communityId,
      command.personId,
    );
    if (!person) {
      throw new PersonNotFoundError(command.personId);
    }
    if (person.isArchived) {
      person.restore();
      await this.personRepo.save(person);
    }
    return person;
  }
}
