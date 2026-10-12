export class PerformanceLogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class PerformanceValueInvalidError extends PerformanceLogError {
  constructor(public readonly field: string) {
    super(`Invalid ${field}`);
  }
}

export class PerformanceNotFoundError extends PerformanceLogError {
  constructor(public readonly performanceId: string) {
    super(`Performance not found: ${performanceId}`);
  }
}

export class ReferencedSongNotFoundError extends PerformanceLogError {
  constructor(public readonly songId: string) {
    super(`Song not found in this community: ${songId}`);
  }
}

export class ReferencedPersonNotFoundError extends PerformanceLogError {
  constructor(public readonly personId: string) {
    super(`Person not found in this community: ${personId}`);
  }
}

export class ReferencedPersonArchivedError extends PerformanceLogError {
  constructor(public readonly personId: string) {
    super(`Person is archived: ${personId}`);
  }
}

export class ReferencedPersonRoleMismatchError extends PerformanceLogError {
  constructor(
    public readonly personId: string,
    public readonly requiredRole: string,
  ) {
    super(`Person ${personId} does not hold the role ${requiredRole}`);
  }
}
