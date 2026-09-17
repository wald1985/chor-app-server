import {
  BadRequestException,
  ConflictException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CannotDeleteSelfError,
  IncorrectCurrentPasswordError,
  InvalidCredentialsError,
  InvalidSuperadminValueError,
  LastSuperadminError,
  SuperadminEmailTakenError,
  SuperadminNotFoundError,
  UseChangePasswordError,
} from '../../domain/errors/superadmin.errors';

type ErrorHandler = (error: any) => HttpException;

const ERROR_HANDLERS = new Map<string, ErrorHandler>([
  [
    'InvalidCredentialsError',
    (e: InvalidCredentialsError) =>
      new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: e.message,
        code: 'INVALID_CREDENTIALS',
      }),
  ],
  [
    'IncorrectCurrentPasswordError',
    (e: IncorrectCurrentPasswordError) =>
      new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: e.message,
        code: 'INCORRECT_CURRENT_PASSWORD',
      }),
  ],
  [
    'InvalidSuperadminValueError',
    (e: InvalidSuperadminValueError) =>
      new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: e.message,
        code: 'SUPERADMIN_VALUE_INVALID',
        field: e.field,
      }),
  ],
  [
    'SuperadminNotFoundError',
    (e: SuperadminNotFoundError) =>
      new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: e.message,
        code: 'SUPERADMIN_NOT_FOUND',
      }),
  ],
  [
    'SuperadminEmailTakenError',
    (e: SuperadminEmailTakenError) =>
      new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: e.message,
        code: 'SUPERADMIN_EMAIL_TAKEN',
        existingId: e.existingId,
      }),
  ],
  [
    'CannotDeleteSelfError',
    (e: CannotDeleteSelfError) =>
      new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: e.message,
        code: 'SUPERADMIN_CANNOT_DELETE_SELF',
      }),
  ],
  [
    'UseChangePasswordError',
    (e: UseChangePasswordError) =>
      new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: e.message,
        code: 'SUPERADMIN_USE_CHANGE_PASSWORD',
      }),
  ],
  [
    'LastSuperadminError',
    (e: LastSuperadminError) =>
      new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: e.message,
        code: 'SUPERADMIN_LAST_REMAINING',
      }),
  ],
]);

export function toSuperadminHttpException(error: unknown): HttpException {
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
