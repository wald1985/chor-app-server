import {
  BadRequestException,
  ConflictException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  AttachmentAlreadyExistsError,
  AttachmentArchivedError,
  AttachmentNotFoundError,
  FolderArchivedError,
  FolderNotFoundError,
  FolderSongArchivedError,
  FolderSongNotFoundError,
  FolderSongNumberConflictError,
  FolderTitleConflictError,
  PrintedEditionReadOnlyError,
  RepertoireValueInvalidError,
  ThemeArchivedError,
  ThemeNameConflictError,
  ThemeNotFoundError,
} from '../../domain/errors/repertoire.errors';

type ErrorHandler = (error: any) => HttpException;

const ERROR_HANDLERS = new Map<string, ErrorHandler>([
  [
    'RepertoireValueInvalidError',
    (e: RepertoireValueInvalidError) =>
      new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: e.message,
        code: 'REPERTOIRE_VALUE_INVALID',
        field: e.field,
      }),
  ],
  [
    'FolderNotFoundError',
    (e: FolderNotFoundError) =>
      new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: e.message,
        code: 'REPERTOIRE_FOLDER_NOT_FOUND',
        folderId: e.folderId,
      }),
  ],
  [
    'FolderArchivedError',
    (e: FolderArchivedError) =>
      new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: e.message,
        code: 'REPERTOIRE_FOLDER_ARCHIVED',
        folderId: e.folderId,
      }),
  ],
  [
    'FolderTitleConflictError',
    (e: FolderTitleConflictError) =>
      new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: e.message,
        code: 'REPERTOIRE_FOLDER_TITLE_CONFLICT',
        title: e.title,
      }),
  ],
  [
    'FolderSongNotFoundError',
    (e: FolderSongNotFoundError) =>
      new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: e.message,
        code: 'REPERTOIRE_FOLDER_SONG_NOT_FOUND',
        songId: e.songId,
      }),
  ],
  [
    'FolderSongArchivedError',
    (e: FolderSongArchivedError) =>
      new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: e.message,
        code: 'REPERTOIRE_FOLDER_SONG_ARCHIVED',
        songId: e.songId,
      }),
  ],
  [
    'FolderSongNumberConflictError',
    (e: FolderSongNumberConflictError) =>
      new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: e.message,
        code: 'REPERTOIRE_FOLDER_SONG_NUMBER_CONFLICT',
        folderId: e.folderId,
        number: e.number,
      }),
  ],
  [
    'AttachmentNotFoundError',
    (e: AttachmentNotFoundError) =>
      new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: e.message,
        code: 'REPERTOIRE_ATTACHMENT_NOT_FOUND',
        attachmentId: e.attachmentId,
      }),
  ],
  [
    'AttachmentAlreadyExistsError',
    (e: AttachmentAlreadyExistsError) =>
      new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: e.message,
        code: 'REPERTOIRE_ATTACHMENT_ALREADY_EXISTS',
        libraryBookId: e.libraryBookId,
      }),
  ],
  [
    'AttachmentArchivedError',
    (e: AttachmentArchivedError) =>
      new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: e.message,
        code: 'REPERTOIRE_ATTACHMENT_ARCHIVED',
        attachmentId: e.attachmentId,
      }),
  ],
  [
    'ThemeNotFoundError',
    (e: ThemeNotFoundError) =>
      new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: e.message,
        code: 'REPERTOIRE_THEME_NOT_FOUND',
        themeId: e.themeId,
      }),
  ],
  [
    'ThemeArchivedError',
    (e: ThemeArchivedError) =>
      new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: e.message,
        code: 'REPERTOIRE_THEME_ARCHIVED',
        themeId: e.themeId,
      }),
  ],
  [
    'ThemeNameConflictError',
    (e: ThemeNameConflictError) =>
      new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: e.message,
        code: 'REPERTOIRE_THEME_NAME_CONFLICT',
        name: e.themeName,
      }),
  ],
  [
    'PrintedEditionReadOnlyError',
    (e: PrintedEditionReadOnlyError) =>
      new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: e.message,
        code: 'REPERTOIRE_PRINTED_EDITION_READ_ONLY',
      }),
  ],
]);

export function toRepertoireHttpException(error: unknown): HttpException {
  const errName =
    error instanceof Error
      ? (error.constructor?.name ?? error.name)
      : undefined;
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
