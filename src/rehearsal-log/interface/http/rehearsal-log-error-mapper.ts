import {
  BadRequestException,
  ConflictException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  ReferencedPersonArchivedError,
  ReferencedPersonNotFoundError,
  ReferencedPersonRoleMismatchError,
  ReferencedSongNotFoundError,
  RehearsalDateTakenError,
  RehearsalEntryNotFoundError,
  RehearsalNotEmptyError,
  RehearsalNotFoundError,
  RehearsalValueInvalidError,
} from '../../domain/errors/rehearsal-log.errors';

type ErrorHandler = (error: any) => HttpException;

const badRequest = (
  message: string,
  code: string,
  extra: Record<string, unknown> = {},
) =>
  new BadRequestException({
    statusCode: 400,
    error: 'Bad Request',
    message,
    code,
    ...extra,
  });

const notFound = (
  message: string,
  code: string,
  extra: Record<string, unknown> = {},
) =>
  new NotFoundException({
    statusCode: 404,
    error: 'Not Found',
    message,
    code,
    ...extra,
  });

const conflict = (
  message: string,
  code: string,
  extra: Record<string, unknown> = {},
) =>
  new ConflictException({
    statusCode: 409,
    error: 'Conflict',
    message,
    code,
    ...extra,
  });

const ERROR_HANDLERS = new Map<string, ErrorHandler>([
  [
    'RehearsalValueInvalidError',
    (e: RehearsalValueInvalidError) =>
      badRequest(e.message, 'REHEARSAL_VALUE_INVALID', { field: e.field }),
  ],
  [
    'ReferencedSongNotFoundError',
    (e: ReferencedSongNotFoundError) =>
      badRequest(e.message, 'SONG_NOT_FOUND', { songId: e.songId }),
  ],
  [
    'ReferencedPersonNotFoundError',
    (e: ReferencedPersonNotFoundError) =>
      badRequest(e.message, 'PERSON_NOT_FOUND', { personId: e.personId }),
  ],
  [
    'ReferencedPersonArchivedError',
    (e: ReferencedPersonArchivedError) =>
      badRequest(e.message, 'PERSON_ARCHIVED', { personId: e.personId }),
  ],
  [
    'ReferencedPersonRoleMismatchError',
    (e: ReferencedPersonRoleMismatchError) =>
      badRequest(e.message, 'PERSON_ROLE_MISMATCH', {
        personId: e.personId,
        requiredRole: e.requiredRole,
      }),
  ],
  [
    'RehearsalNotFoundError',
    (e: RehearsalNotFoundError) =>
      notFound(e.message, 'REHEARSAL_NOT_FOUND', {
        rehearsalId: e.rehearsalId,
      }),
  ],
  [
    'RehearsalEntryNotFoundError',
    (e: RehearsalEntryNotFoundError) =>
      notFound(e.message, 'REHEARSAL_ENTRY_NOT_FOUND', { entryId: e.entryId }),
  ],
  [
    'RehearsalDateTakenError',
    (e: RehearsalDateTakenError) =>
      conflict(e.message, 'REHEARSAL_DATE_TAKEN', {
        date: e.date,
        existingRehearsalId: e.existingRehearsalId,
      }),
  ],
  [
    'RehearsalNotEmptyError',
    (e: RehearsalNotEmptyError) =>
      conflict(e.message, 'REHEARSAL_NOT_EMPTY', {
        rehearsalId: e.rehearsalId,
      }),
  ],
]);

export function toRehearsalLogHttpException(error: unknown): HttpException {
  const errName =
    error instanceof Error
      ? (error.constructor?.name ?? error.name)
      : undefined;
  const handler = errName ? ERROR_HANDLERS.get(errName) : undefined;
  if (handler) {
    return handler(error);
  }
  if (error instanceof HttpException) {
    return error;
  }
  return new InternalServerErrorException(
    error instanceof Error ? error.message : 'Internal server error',
  );
}
