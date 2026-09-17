import {
  BadRequestException,
  ConflictException,
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
import { toSuperadminHttpException } from './superadmin-error-mapper';

describe('toSuperadminHttpException', () => {
  it.each([
    [
      new InvalidCredentialsError(),
      UnauthorizedException,
      'INVALID_CREDENTIALS',
    ],
    [
      new IncorrectCurrentPasswordError(),
      BadRequestException,
      'INCORRECT_CURRENT_PASSWORD',
    ],
    [
      new InvalidSuperadminValueError('name'),
      BadRequestException,
      'SUPERADMIN_VALUE_INVALID',
    ],
    [
      new SuperadminNotFoundError('id-1'),
      NotFoundException,
      'SUPERADMIN_NOT_FOUND',
    ],
    [
      new SuperadminEmailTakenError('a@b.com', 'id-2'),
      ConflictException,
      'SUPERADMIN_EMAIL_TAKEN',
    ],
    [
      new CannotDeleteSelfError(),
      ConflictException,
      'SUPERADMIN_CANNOT_DELETE_SELF',
    ],
    [
      new UseChangePasswordError(),
      ConflictException,
      'SUPERADMIN_USE_CHANGE_PASSWORD',
    ],
    [new LastSuperadminError(), ConflictException, 'SUPERADMIN_LAST_REMAINING'],
  ])('maps %p to the right HTTP exception and code', (error, ctor, code) => {
    const result = toSuperadminHttpException(error);
    expect(result).toBeInstanceOf(ctor);
    expect((result.getResponse() as { code: string }).code).toBe(code);
  });

  it('passes through an existing HttpException unchanged', () => {
    const original = new BadRequestException('custom');
    expect(toSuperadminHttpException(original)).toBe(original);
  });

  it('maps an unknown error to 500', () => {
    const result = toSuperadminHttpException(new Error('boom'));
    expect(result.getStatus()).toBe(500);
  });
});
