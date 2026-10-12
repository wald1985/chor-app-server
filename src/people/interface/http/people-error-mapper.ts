import {
  BadRequestException,
  ConflictException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  PersonArchivedError,
  PersonNameTakenError,
  PersonNotFoundError,
  PersonRolesEmptyError,
  PersonValueInvalidError,
} from '../../domain/errors/people.errors';

type ErrorHandler = (error: any) => HttpException;

const ERROR_HANDLERS = new Map<string, ErrorHandler>([
  [
    'PersonValueInvalidError',
    (e: PersonValueInvalidError) =>
      new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: e.message,
        code: 'PERSON_VALUE_INVALID',
        field: e.field,
      }),
  ],
  [
    'PersonRolesEmptyError',
    (e: PersonRolesEmptyError) =>
      new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: e.message,
        code: 'PERSON_ROLES_EMPTY',
      }),
  ],
  [
    'PersonNotFoundError',
    (e: PersonNotFoundError) =>
      new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: e.message,
        code: 'PERSON_NOT_FOUND',
        personId: e.personId,
      }),
  ],
  [
    'PersonArchivedError',
    (e: PersonArchivedError) =>
      new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: e.message,
        code: 'PERSON_ARCHIVED',
        personId: e.personId,
      }),
  ],
  [
    'PersonNameTakenError',
    (e: PersonNameTakenError) =>
      new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: e.message,
        code: 'PERSON_NAME_TAKEN',
        existingPersonId: e.existingPersonId,
        existingArchived: e.existingArchived,
      }),
  ],
]);

export function toPeopleHttpException(error: unknown): HttpException {
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
