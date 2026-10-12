import { Inject, Injectable } from '@nestjs/common';
import { Person } from '../../domain/entities/person.entity';
import { PersonNotFoundError } from '../../domain/errors/people.errors';
import { PERSON_REPOSITORY } from '../../domain/ports/person-repository.port';
import type { PersonRepository } from '../../domain/ports/person-repository.port';

export interface PersonCommand {
  communityId: string;
  personId: string;
}

/** Idempotent: archiving an archived Person returns it unchanged. */
@Injectable()
export class ArchivePersonUseCase {
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
      return person;
    }
    person.archive(new Date());
    return this.personRepo.save(person);
  }
}
