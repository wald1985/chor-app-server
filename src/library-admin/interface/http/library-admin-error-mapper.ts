import { HttpException } from '@nestjs/common';
import { toLibraryHttpException } from '../../../library';

export function toLibraryAdminHttpException(error: unknown): HttpException {
  return toLibraryHttpException(error);
}
