export class RepertoireError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class RepertoireValueInvalidError extends RepertoireError {
  constructor(public readonly field: string) {
    super(`Invalid ${field}`);
  }
}

export class FolderNotFoundError extends RepertoireError {
  constructor(public readonly folderId: string) {
    super(`Folder not found: ${folderId}`);
  }
}

export class FolderArchivedError extends RepertoireError {
  constructor(public readonly folderId: string) {
    super(`Folder is archived: ${folderId}`);
  }
}

export class FolderTitleConflictError extends RepertoireError {
  constructor(
    public readonly communityId: string,
    public readonly title: string,
  ) {
    super(`Folder title already exists: ${title}`);
  }
}

export class FolderSongNotFoundError extends RepertoireError {
  constructor(public readonly songId: string) {
    super(`Folder song not found: ${songId}`);
  }
}

export class FolderSongArchivedError extends RepertoireError {
  constructor(public readonly songId: string) {
    super(`Folder song is archived: ${songId}`);
  }
}

export class FolderSongNumberConflictError extends RepertoireError {
  constructor(
    public readonly folderId: string,
    public readonly number: string,
  ) {
    super(`Folder song number already exists in folder ${folderId}: ${number}`);
  }
}

export class AttachmentNotFoundError extends RepertoireError {
  constructor(public readonly attachmentId: string) {
    super(`Book attachment not found: ${attachmentId}`);
  }
}

export class AttachmentAlreadyExistsError extends RepertoireError {
  constructor(
    public readonly communityId: string,
    public readonly libraryBookId: string,
  ) {
    super(
      `Book ${libraryBookId} is already attached to community ${communityId}`,
    );
  }
}

export class AttachmentArchivedError extends RepertoireError {
  constructor(public readonly attachmentId: string) {
    super(`Book attachment is archived: ${attachmentId}`);
  }
}

export class ThemeNotFoundError extends RepertoireError {
  constructor(public readonly themeId: string) {
    super(`Theme not found: ${themeId}`);
  }
}

export class ThemeArchivedError extends RepertoireError {
  constructor(public readonly themeId: string) {
    super(`Theme is archived: ${themeId}`);
  }
}

export class ThemeNameConflictError extends RepertoireError {
  constructor(
    public readonly communityId: string,
    public readonly themeName: string,
  ) {
    super(`Theme name already exists: ${themeName}`);
  }
}

export class PrintedEditionReadOnlyError extends RepertoireError {
  constructor(message = 'Printed edition is read-only') {
    super(message);
  }
}
