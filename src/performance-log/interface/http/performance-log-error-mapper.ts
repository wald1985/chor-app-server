import {
  BadRequestException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  PerformanceNotFoundError,
  PerformanceValueInvalidError,
  ReferencedPersonArchivedError,
  ReferencedPersonNotFoundError,
  ReferencedPersonRoleMismatchError,
  ReferencedSongNotFoundError,
} from '../../domain/errors/performance-log.errors';

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

const ERROR_HANDLERS = new Map<string, ErrorHandler>([
  [
    'PerformanceValueInvalidError',
    (e: PerformanceValueInvalidError) =>
      badRequest(e.message, 'PERFORMANCE_VALUE_INVALID', { field: e.field }),
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
    'PerformanceNotFoundError',
    (e: PerformanceNotFoundError) =>
      new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: e.message,
        code: 'PERFORMANCE_NOT_FOUND',
        performanceId: e.performanceId,
      }),
  ],
]);

export function toPerformanceLogHttpException(error: unknown): HttpException {
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
