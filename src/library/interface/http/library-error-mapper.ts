import {
  BadRequestException,
  ConflictException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  BookNotFoundError,
  BookPlacementInvalidError,
  BookTitleTakenError,
  LibraryBusyError,
  LibraryFileInvalidError,
  LibraryImportPlanChangedError,
  LibraryItemArchivedError,
  LibraryItemInUseError,
  LibraryValueInvalidError,
  LookupScopeInvalidError,
  NumberScopeConflictError,
  SeriesHasActiveBooksError,
  SeriesNotFoundError,
  SeriesTitleTakenError,
  SongNotFoundError,
  SongNumberTakenError,
  ThemeNameTakenError,
  ThemeNotFoundError,
  VolumeTakenError,
} from '../../domain/errors/library.errors';

type ErrorHandler = (error: any) => HttpException;

const ERROR_HANDLERS = new Map<string, ErrorHandler>([
  [
    'LibraryValueInvalidError',
    (e: LibraryValueInvalidError) =>
      new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: e.message,
        code: 'LIBRARY_VALUE_INVALID',
        field: e.field,
      }),
  ],
  [
    'BookPlacementInvalidError',
    (e: BookPlacementInvalidError) =>
      new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: e.message,
        code: 'LIBRARY_BOOK_PLACEMENT_INVALID',
      }),
  ],
  [
    'LookupScopeInvalidError',
    (e: LookupScopeInvalidError) =>
      new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: e.message,
        code: 'LIBRARY_LOOKUP_SCOPE_INVALID',
      }),
  ],
  [
    'LibraryFileInvalidError',
    (e: LibraryFileInvalidError) =>
      new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: e.message,
        code: 'LIBRARY_FILE_INVALID',
        errors: e.errors,
      }),
  ],
  [
    'SeriesNotFoundError',
    (e: SeriesNotFoundError) =>
      new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: e.message,
        code: 'LIBRARY_SERIES_NOT_FOUND',
        id: e.id,
      }),
  ],
  [
    'BookNotFoundError',
    (e: BookNotFoundError) =>
      new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: e.message,
        code: 'LIBRARY_BOOK_NOT_FOUND',
        id: e.id,
      }),
  ],
  [
    'SongNotFoundError',
    (e: SongNotFoundError) =>
      new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: e.message,
        code: 'LIBRARY_SONG_NOT_FOUND',
        id: e.id,
      }),
  ],
  [
    'ThemeNotFoundError',
    (e: ThemeNotFoundError) =>
      new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: e.message,
        code: 'LIBRARY_THEME_NOT_FOUND',
        id: e.id,
      }),
  ],
  [
    'SeriesTitleTakenError',
    (e: SeriesTitleTakenError) =>
      new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: e.message,
        code: 'LIBRARY_SERIES_TITLE_TAKEN',
        existingId: e.existingId,
        existingArchived: e.existingArchived,
      }),
  ],
  [
    'BookTitleTakenError',
    (e: BookTitleTakenError) =>
      new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: e.message,
        code: 'LIBRARY_BOOK_TITLE_TAKEN',
        existingId: e.existingId,
        existingArchived: e.existingArchived,
      }),
  ],
  [
    'VolumeTakenError',
    (e: VolumeTakenError) =>
      new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: e.message,
        code: 'LIBRARY_VOLUME_TAKEN',
        existingBookId: e.existingBookId,
      }),
  ],
  [
    'SongNumberTakenError',
    (e: SongNumberTakenError) =>
      new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: e.message,
        code: 'LIBRARY_SONG_NUMBER_TAKEN',
        existingSongId: e.existingSongId,
        existingBookId: e.existingBookId,
        existingArchived: e.existingArchived,
      }),
  ],
  [
    'NumberScopeConflictError',
    (e: NumberScopeConflictError) =>
      new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: e.message,
        code: 'LIBRARY_NUMBER_SCOPE_CONFLICT',
        numbers: e.numbers,
      }),
  ],
  [
    'ThemeNameTakenError',
    (e: ThemeNameTakenError) =>
      new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: e.message,
        code: 'LIBRARY_THEME_NAME_TAKEN',
        existingThemeId: e.existingThemeId,
        existingArchived: e.existingArchived,
      }),
  ],
  [
    'SeriesHasActiveBooksError',
    (e: SeriesHasActiveBooksError) =>
      new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: e.message,
        code: 'LIBRARY_SERIES_HAS_ACTIVE_BOOKS',
        bookIds: e.bookIds,
      }),
  ],
  [
    'LibraryItemInUseError',
    (e: LibraryItemInUseError) =>
      new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: e.message,
        code: 'LIBRARY_ITEM_IN_USE',
        usage: e.usage,
      }),
  ],
  [
    'LibraryImportPlanChangedError',
    (e: LibraryImportPlanChangedError) =>
      new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: e.message,
        code: 'LIBRARY_IMPORT_PLAN_CHANGED',
        planHash: e.planHash,
      }),
  ],
  [
    'LibraryBusyError',
    (e: LibraryBusyError) =>
      new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: e.message,
        code: 'LIBRARY_BUSY',
      }),
  ],
]);

export function toLibraryHttpException(error: unknown): HttpException {
  if (error instanceof LibraryItemArchivedError) {
    return new ConflictException({
      statusCode: 409,
      error: 'Conflict',
      message: error.message,
      code: 'LIBRARY_ITEM_ARCHIVED',
      type: error.itemType,
      id: error.id,
    });
  }

  const errName = error instanceof Error ? error.name : undefined;
  if (errName) {
    const handler = ERROR_HANDLERS.get(errName);
    if (handler) {
      return handler(error);
    }
  }

  if (error instanceof HttpException) {
    return error;
  }

  return new InternalServerErrorException(
    error instanceof Error ? error.message : 'Internal server error',
  );
}
