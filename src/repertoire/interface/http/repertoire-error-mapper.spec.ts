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
import { toRepertoireHttpException } from './repertoire-error-mapper';

describe('toRepertoireHttpException', () => {
  it('maps RepertoireValueInvalidError to 400 with field', () => {
    const exc = toRepertoireHttpException(
      new RepertoireValueInvalidError('title'),
    );
    expect(exc.getStatus()).toBe(400);
    expect(exc.getResponse()).toMatchObject({
      statusCode: 400,
      code: 'REPERTOIRE_VALUE_INVALID',
      field: 'title',
    });
  });

  it('maps FolderNotFoundError to 404', () => {
    const exc = toRepertoireHttpException(new FolderNotFoundError('f-1'));
    expect(exc.getStatus()).toBe(404);
    expect(exc.getResponse()).toMatchObject({
      statusCode: 404,
      code: 'REPERTOIRE_FOLDER_NOT_FOUND',
      folderId: 'f-1',
    });
  });

  it('maps FolderArchivedError to 409', () => {
    const exc = toRepertoireHttpException(new FolderArchivedError('f-1'));
    expect(exc.getStatus()).toBe(409);
    expect(exc.getResponse()).toMatchObject({
      statusCode: 409,
      code: 'REPERTOIRE_FOLDER_ARCHIVED',
      folderId: 'f-1',
    });
  });

  it('maps FolderTitleConflictError to 409', () => {
    const exc = toRepertoireHttpException(
      new FolderTitleConflictError('c-1', 'Youth Songs'),
    );
    expect(exc.getStatus()).toBe(409);
    expect(exc.getResponse()).toMatchObject({
      statusCode: 409,
      code: 'REPERTOIRE_FOLDER_TITLE_CONFLICT',
      title: 'Youth Songs',
    });
  });

  it('maps FolderSongNotFoundError to 404', () => {
    const exc = toRepertoireHttpException(new FolderSongNotFoundError('s-1'));
    expect(exc.getStatus()).toBe(404);
    expect(exc.getResponse()).toMatchObject({
      statusCode: 404,
      code: 'REPERTOIRE_FOLDER_SONG_NOT_FOUND',
      songId: 's-1',
    });
  });

  it('maps FolderSongArchivedError to 409', () => {
    const exc = toRepertoireHttpException(new FolderSongArchivedError('s-1'));
    expect(exc.getStatus()).toBe(409);
    expect(exc.getResponse()).toMatchObject({
      statusCode: 409,
      code: 'REPERTOIRE_FOLDER_SONG_ARCHIVED',
      songId: 's-1',
    });
  });

  it('maps FolderSongNumberConflictError to 409', () => {
    const exc = toRepertoireHttpException(
      new FolderSongNumberConflictError('f-1', '42'),
    );
    expect(exc.getStatus()).toBe(409);
    expect(exc.getResponse()).toMatchObject({
      statusCode: 409,
      code: 'REPERTOIRE_FOLDER_SONG_NUMBER_CONFLICT',
      folderId: 'f-1',
      number: '42',
    });
  });

  it('maps AttachmentNotFoundError to 404', () => {
    const exc = toRepertoireHttpException(new AttachmentNotFoundError('a-1'));
    expect(exc.getStatus()).toBe(404);
    expect(exc.getResponse()).toMatchObject({
      statusCode: 404,
      code: 'REPERTOIRE_ATTACHMENT_NOT_FOUND',
      attachmentId: 'a-1',
    });
  });

  it('maps AttachmentAlreadyExistsError to 409', () => {
    const exc = toRepertoireHttpException(
      new AttachmentAlreadyExistsError('c-1', 'b-1'),
    );
    expect(exc.getStatus()).toBe(409);
    expect(exc.getResponse()).toMatchObject({
      statusCode: 409,
      code: 'REPERTOIRE_ATTACHMENT_ALREADY_EXISTS',
      libraryBookId: 'b-1',
    });
  });

  it('maps AttachmentArchivedError to 409', () => {
    const exc = toRepertoireHttpException(new AttachmentArchivedError('a-1'));
    expect(exc.getStatus()).toBe(409);
    expect(exc.getResponse()).toMatchObject({
      statusCode: 409,
      code: 'REPERTOIRE_ATTACHMENT_ARCHIVED',
      attachmentId: 'a-1',
    });
  });

  it('maps ThemeNotFoundError to 404', () => {
    const exc = toRepertoireHttpException(new ThemeNotFoundError('t-1'));
    expect(exc.getStatus()).toBe(404);
    expect(exc.getResponse()).toMatchObject({
      statusCode: 404,
      code: 'REPERTOIRE_THEME_NOT_FOUND',
      themeId: 't-1',
    });
  });

  it('maps ThemeArchivedError to 409', () => {
    const exc = toRepertoireHttpException(new ThemeArchivedError('t-1'));
    expect(exc.getStatus()).toBe(409);
    expect(exc.getResponse()).toMatchObject({
      statusCode: 409,
      code: 'REPERTOIRE_THEME_ARCHIVED',
      themeId: 't-1',
    });
  });

  it('maps ThemeNameConflictError to 409', () => {
    const exc = toRepertoireHttpException(
      new ThemeNameConflictError('c-1', 'Easter'),
    );
    expect(exc.getStatus()).toBe(409);
    expect(exc.getResponse()).toMatchObject({
      statusCode: 409,
      code: 'REPERTOIRE_THEME_NAME_CONFLICT',
      name: 'Easter',
    });
  });

  it('maps PrintedEditionReadOnlyError to 400', () => {
    const exc = toRepertoireHttpException(new PrintedEditionReadOnlyError());
    expect(exc.getStatus()).toBe(400);
    expect(exc.getResponse()).toMatchObject({
      statusCode: 400,
      code: 'REPERTOIRE_PRINTED_EDITION_READ_ONLY',
    });
  });
});
