import { Inject, Injectable } from '@nestjs/common';
import { Person } from '../../domain/entities/person.entity';
import { PersonNameTakenError } from '../../domain/errors/people.errors';
import { PERSON_REPOSITORY } from '../../domain/ports/person-repository.port';
import type { PersonRepository } from '../../domain/ports/person-repository.port';
import { PersonName } from '../../domain/value-objects/person-name';
import { PersonRoles } from '../../domain/value-objects/person-roles';

export interface CreatePersonCommand {
  communityId: string;
  name: string;
  roles: string[];
}

@Injectable()
export class CreatePersonUseCase {
  constructor(
    @Inject(PERSON_REPOSITORY)
    private readonly personRepo: PersonRepository,
  ) {}

  async execute(command: CreatePersonCommand): Promise<Person> {
    const name = new PersonName(command.name);
    const roles = new PersonRoles(command.roles);

    const existing = await this.personRepo.findByNameKey(
      command.communityId,
      name.key,
    );
    if (existing) {
      throw new PersonNameTakenError(
        name.value,
        existing.id,
        existing.isArchived,
      );
    }

    const person = Person.create({
      communityId: command.communityId,
      name,
      roles,
    });
    await this.personRepo.save(person);
    return person;
  }
}
