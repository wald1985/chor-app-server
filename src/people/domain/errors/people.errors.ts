export class PeopleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class PersonValueInvalidError extends PeopleError {
  constructor(public readonly field: string) {
    super(`Invalid ${field}`);
  }
}

export class PersonRolesEmptyError extends PeopleError {
  constructor() {
    super('A person must have at least one role');
  }
}

export class PersonNotFoundError extends PeopleError {
  constructor(public readonly personId: string) {
    super(`Person not found: ${personId}`);
  }
}

export class PersonArchivedError extends PeopleError {
  constructor(public readonly personId: string) {
    super(`Person is archived: ${personId}`);
  }
}

export class PersonNameTakenError extends PeopleError {
  constructor(
    public readonly name: string,
    public readonly existingPersonId: string,
    public readonly existingArchived: boolean,
  ) {
    super(`Person name already exists: ${name}`);
  }
}
