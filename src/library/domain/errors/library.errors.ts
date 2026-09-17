export class LibraryValueInvalidError extends Error {
  constructor(
    public readonly field: string,
    message?: string,
  ) {
    super(message ?? `Invalid library value for field: ${field}`);
    this.name = 'LibraryValueInvalidError';
  }
}

export class BookPlacementInvalidError extends Error {
  constructor() {
    super(
      'Book placement is invalid: seriesId and volume must both be set or both be null',
    );
    this.name = 'BookPlacementInvalidError';
  }
}

export class LookupScopeInvalidError extends Error {
  constructor() {
    super(
      'Lookup scope is invalid: exactly one of bookId or seriesId must be specified',
    );
    this.name = 'LookupScopeInvalidError';
  }
}

export class SeriesNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Series not found: ${id}`);
    this.name = 'SeriesNotFoundError';
  }
}

export class BookNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Book not found: ${id}`);
    this.name = 'BookNotFoundError';
  }
}

export class SongNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Song not found: ${id}`);
    this.name = 'SongNotFoundError';
  }
}

export class ThemeNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Theme not found: ${id}`);
    this.name = 'ThemeNotFoundError';
  }
}

export class SeriesTitleTakenError extends Error {
  constructor(
    public readonly existingId?: string,
    public readonly existingArchived?: boolean,
  ) {
    super('Series title is already taken');
    this.name = 'SeriesTitleTakenError';
  }
}

export class BookTitleTakenError extends Error {
  constructor(
    public readonly existingId?: string,
    public readonly existingArchived?: boolean,
  ) {
    super('Book title is already taken');
    this.name = 'BookTitleTakenError';
  }
}

export class VolumeTakenError extends Error {
  constructor(public readonly existingBookId?: string) {
    super('Volume is already taken in this series');
    this.name = 'VolumeTakenError';
  }
}

export class SongNumberTakenError extends Error {
  constructor(
    public readonly existingSongId?: string,
    public readonly existingBookId?: string,
    public readonly existingArchived?: boolean,
  ) {
    super('Song number is already taken in this number scope');
    this.name = 'SongNumberTakenError';
  }
}

export class NumberScopeConflictError extends Error {
  constructor(public readonly numbers: string[]) {
    super(`Number scope conflict for songs: ${numbers.join(', ')}`);
    this.name = 'NumberScopeConflictError';
  }
}

export class ThemeNameTakenError extends Error {
  constructor(
    public readonly existingThemeId?: string,
    public readonly existingArchived?: boolean,
  ) {
    super('Theme name is already taken');
    this.name = 'ThemeNameTakenError';
  }
}

export class LibraryItemArchivedError extends Error {
  constructor(
    public readonly itemType: string,
    public readonly id: string,
  ) {
    super(`Cannot modify archived ${itemType} with id: ${id}`);
    this.name = 'LibraryItemArchivedError';
  }
}

export class SeriesArchivedError extends LibraryItemArchivedError {
  constructor(id: string) {
    super('series', id);
    this.name = 'SeriesArchivedError';
  }
}

export class BookArchivedError extends LibraryItemArchivedError {
  constructor(id: string) {
    super('book', id);
    this.name = 'BookArchivedError';
  }
}

export class SongArchivedError extends LibraryItemArchivedError {
  constructor(id: string) {
    super('song', id);
    this.name = 'SongArchivedError';
  }
}

export class ThemeArchivedError extends LibraryItemArchivedError {
  constructor(id: string) {
    super('theme', id);
    this.name = 'ThemeArchivedError';
  }
}

export class SeriesHasActiveBooksError extends Error {
  constructor(public readonly bookIds: string[]) {
    super(
      `Cannot archive series because it has active books: ${bookIds.join(', ')}`,
    );
    this.name = 'SeriesHasActiveBooksError';
  }
}

export class LibraryItemInUseError extends Error {
  constructor(
    public readonly usage: { communities: number; references: number },
  ) {
    super('Cannot archive library item: it is currently in use');
    this.name = 'LibraryItemInUseError';
  }
}

export class LibraryImportPlanChangedError extends Error {
  constructor(public readonly planHash: string) {
    super('Import plan has changed since preview');
    this.name = 'LibraryImportPlanChangedError';
  }
}

export class LibraryBusyError extends Error {
  constructor() {
    super(
      'Library catalog modification is currently locked by another operation',
    );
    this.name = 'LibraryBusyError';
  }
}

export class LibraryFileInvalidError extends Error {
  constructor(public readonly errors: unknown[]) {
    super('Library import file is invalid');
    this.name = 'LibraryFileInvalidError';
  }
}
