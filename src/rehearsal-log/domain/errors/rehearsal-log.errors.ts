export class RehearsalLogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class RehearsalValueInvalidError extends RehearsalLogError {
  constructor(public readonly field: string) {
    super(`Invalid ${field}`);
  }
}

export class RehearsalNotFoundError extends RehearsalLogError {
  constructor(public readonly rehearsalId: string) {
    super(`Rehearsal not found: ${rehearsalId}`);
  }
}

export class RehearsalEntryNotFoundError extends RehearsalLogError {
  constructor(public readonly entryId: string) {
    super(`Rehearsal entry not found: ${entryId}`);
  }
}

export class RehearsalDateTakenError extends RehearsalLogError {
  constructor(
    public readonly date: string,
    public readonly existingRehearsalId: string,
  ) {
    super(`A rehearsal already exists on ${date}`);
  }
}

export class RehearsalNotEmptyError extends RehearsalLogError {
  constructor(public readonly rehearsalId: string) {
    super(`Rehearsal still has entries: ${rehearsalId}`);
  }
}

export class ReferencedSongNotFoundError extends RehearsalLogError {
  constructor(public readonly songId: string) {
    super(`Song not found in this community: ${songId}`);
  }
}

export class ReferencedPersonNotFoundError extends RehearsalLogError {
  constructor(public readonly personId: string) {
    super(`Person not found in this community: ${personId}`);
  }
}

export class ReferencedPersonArchivedError extends RehearsalLogError {
  constructor(public readonly personId: string) {
    super(`Person is archived: ${personId}`);
  }
}

export class ReferencedPersonRoleMismatchError extends RehearsalLogError {
  constructor(
    public readonly personId: string,
    public readonly requiredRole: string,
  ) {
    super(`Person ${personId} does not hold the role ${requiredRole}`);
  }
}
