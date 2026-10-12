import { Inject, Injectable } from '@nestjs/common';
import { Person } from '../../domain/entities/person.entity';
import {
  PersonArchivedError,
  PersonNameTakenError,
  PersonNotFoundError,
} from '../../domain/errors/people.errors';
import { PERSON_REPOSITORY } from '../../domain/ports/person-repository.port';
import type { PersonRepository } from '../../domain/ports/person-repository.port';
import { PersonName } from '../../domain/value-objects/person-name';
import { PersonRoles } from '../../domain/value-objects/person-roles';

export interface UpdatePersonCommand {
  communityId: string;
  personId: string;
  name?: string;
  roles?: string[];
}

@Injectable()
export class UpdatePersonUseCase {
  constructor(
    @Inject(PERSON_REPOSITORY)
    private readonly personRepo: PersonRepository,
  ) {}

  async execute(command: UpdatePersonCommand): Promise<Person> {
    const person = await this.personRepo.findById(
      command.communityId,
      command.personId,
    );
    if (!person) {
      throw new PersonNotFoundError(command.personId);
    }
    if (person.isArchived) {
      throw new PersonArchivedError(person.id);
    }

    // Validate everything before mutating, so a bad request changes nothing.
    const name =
      command.name === undefined ? undefined : new PersonName(command.name);
    const roles =
      command.roles === undefined ? undefined : new PersonRoles(command.roles);

    if (name) {
      await this.assertNameFree(person, name);
      person.rename(name);
    }
    if (roles) {
      person.changeRoles(roles);
    }

    await this.personRepo.save(person);
    return person;
  }

  private async assertNameFree(person: Person, name: PersonName) {
    const existing = await this.personRepo.findByNameKey(
      person.communityId,
      name.key,
    );
    if (existing && existing.id !== person.id) {
      throw new PersonNameTakenError(
        name.value,
        existing.id,
        existing.isArchived,
      );
    }
  }
}
