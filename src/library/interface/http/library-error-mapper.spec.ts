import { BadRequestException } from '@nestjs/common';
import {
  BookArchivedError,
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
  SeriesArchivedError,
  SeriesHasActiveBooksError,
  SeriesNotFoundError,
  SeriesTitleTakenError,
  SongArchivedError,
  SongNotFoundError,
  SongNumberTakenError,
  ThemeArchivedError,
  ThemeNameTakenError,
  ThemeNotFoundError,
  VolumeTakenError,
} from '../../domain/errors/library.errors';
import { toLibraryHttpException } from './library-error-mapper';

describe('toLibraryHttpException', () => {
  it('maps LibraryValueInvalidError to 400 with field', () => {
    const exc = toLibraryHttpException(new LibraryValueInvalidError('number'));
    expect(exc.getStatus()).toBe(400);
    expect(exc.getResponse()).toMatchObject({
      statusCode: 400,
      code: 'LIBRARY_VALUE_INVALID',
      field: 'number',
    });
  });

  it('maps BookPlacementInvalidError to 400', () => {
    const exc = toLibraryHttpException(new BookPlacementInvalidError());
    expect(exc.getStatus()).toBe(400);
    expect(exc.getResponse()).toMatchObject({
      statusCode: 400,
      code: 'LIBRARY_BOOK_PLACEMENT_INVALID',
    });
  });

  it('maps LookupScopeInvalidError to 400', () => {
    const exc = toLibraryHttpException(new LookupScopeInvalidError());
    expect(exc.getStatus()).toBe(400);
    expect(exc.getResponse()).toMatchObject({
      statusCode: 400,
      code: 'LIBRARY_LOOKUP_SCOPE_INVALID',
    });
  });

  it('maps LibraryFileInvalidError to 400 with errors', () => {
    const exc = toLibraryHttpException(new LibraryFileInvalidError(['error1']));
    expect(exc.getStatus()).toBe(400);
    expect(exc.getResponse()).toMatchObject({
      statusCode: 400,
      code: 'LIBRARY_FILE_INVALID',
      errors: ['error1'],
    });
  });

  it('maps SeriesNotFoundError to 404', () => {
    const exc = toLibraryHttpException(new SeriesNotFoundError('s1'));
    expect(exc.getStatus()).toBe(404);
    expect(exc.getResponse()).toMatchObject({
      statusCode: 404,
      code: 'LIBRARY_SERIES_NOT_FOUND',
      id: 's1',
    });
  });

  it('maps BookNotFoundError to 404', () => {
    const exc = toLibraryHttpException(new BookNotFoundError('b1'));
    expect(exc.getStatus()).toBe(404);
    expect(exc.getResponse()).toMatchObject({
      statusCode: 404,
      code: 'LIBRARY_BOOK_NOT_FOUND',
      id: 'b1',
    });
  });

  it('maps SongNotFoundError to 404', () => {
    const exc = toLibraryHttpException(new SongNotFoundError('song1'));
    expect(exc.getStatus()).toBe(404);
    expect(exc.getResponse()).toMatchObject({
      statusCode: 404,
      code: 'LIBRARY_SONG_NOT_FOUND',
      id: 'song1',
    });
  });

  it('maps ThemeNotFoundError to 404', () => {
    const exc = toLibraryHttpException(new ThemeNotFoundError('t1'));
    expect(exc.getStatus()).toBe(404);
    expect(exc.getResponse()).toMatchObject({
      statusCode: 404,
      code: 'LIBRARY_THEME_NOT_FOUND',
      id: 't1',
    });
  });

  it('maps SeriesTitleTakenError to 409', () => {
    const exc = toLibraryHttpException(new SeriesTitleTakenError('s1', true));
    expect(exc.getStatus()).toBe(409);
    expect(exc.getResponse()).toMatchObject({
      statusCode: 409,
      code: 'LIBRARY_SERIES_TITLE_TAKEN',
      existingId: 's1',
      existingArchived: true,
    });
  });

  it('maps BookTitleTakenError to 409', () => {
    const exc = toLibraryHttpException(new BookTitleTakenError('b1', false));
    expect(exc.getStatus()).toBe(409);
    expect(exc.getResponse()).toMatchObject({
      statusCode: 409,
      code: 'LIBRARY_BOOK_TITLE_TAKEN',
      existingId: 'b1',
      existingArchived: false,
    });
  });

  it('maps VolumeTakenError to 409', () => {
    const exc = toLibraryHttpException(new VolumeTakenError('b1'));
    expect(exc.getStatus()).toBe(409);
    expect(exc.getResponse()).toMatchObject({
      statusCode: 409,
      code: 'LIBRARY_VOLUME_TAKEN',
      existingBookId: 'b1',
    });
  });

  it('maps SongNumberTakenError to 409', () => {
    const exc = toLibraryHttpException(
      new SongNumberTakenError('sg1', 'b1', false),
    );
    expect(exc.getStatus()).toBe(409);
    expect(exc.getResponse()).toMatchObject({
      statusCode: 409,
      code: 'LIBRARY_SONG_NUMBER_TAKEN',
      existingSongId: 'sg1',
      existingBookId: 'b1',
      existingArchived: false,
    });
  });

  it('maps NumberScopeConflictError to 409 with numbers', () => {
    const exc = toLibraryHttpException(
      new NumberScopeConflictError(['1', '2']),
    );
    expect(exc.getStatus()).toBe(409);
    expect(exc.getResponse()).toMatchObject({
      statusCode: 409,
      code: 'LIBRARY_NUMBER_SCOPE_CONFLICT',
      numbers: ['1', '2'],
    });
  });

  it('maps ThemeNameTakenError to 409', () => {
    const exc = toLibraryHttpException(new ThemeNameTakenError('t1', false));
    expect(exc.getStatus()).toBe(409);
    expect(exc.getResponse()).toMatchObject({
      statusCode: 409,
      code: 'LIBRARY_THEME_NAME_TAKEN',
      existingThemeId: 't1',
      existingArchived: false,
    });
  });

  it.each([
    {
      error: new LibraryItemArchivedError('book', 'b1'),
      type: 'book',
      id: 'b1',
    },
    { error: new SeriesArchivedError('s1'), type: 'series', id: 's1' },
    { error: new BookArchivedError('b2'), type: 'book', id: 'b2' },
    { error: new SongArchivedError('sg2'), type: 'song', id: 'sg2' },
    { error: new ThemeArchivedError('t2'), type: 'theme', id: 't2' },
  ])(
    'maps $error.constructor.name to 409 LIBRARY_ITEM_ARCHIVED',
    ({ error, type, id }) => {
      const exc = toLibraryHttpException(error);
      expect(exc.getStatus()).toBe(409);
      expect(exc.getResponse()).toMatchObject({
        statusCode: 409,
        code: 'LIBRARY_ITEM_ARCHIVED',
        type,
        id,
      });
    },
  );

  it('maps SeriesHasActiveBooksError to 409 with bookIds', () => {
    const exc = toLibraryHttpException(
      new SeriesHasActiveBooksError(['b1', 'b2']),
    );
    expect(exc.getStatus()).toBe(409);
    expect(exc.getResponse()).toMatchObject({
      statusCode: 409,
      code: 'LIBRARY_SERIES_HAS_ACTIVE_BOOKS',
      bookIds: ['b1', 'b2'],
    });
  });

  it('maps LibraryItemInUseError to 409 with usage', () => {
    const exc = toLibraryHttpException(
      new LibraryItemInUseError({ communities: 3, references: 7 }),
    );
    expect(exc.getStatus()).toBe(409);
    expect(exc.getResponse()).toMatchObject({
      statusCode: 409,
      code: 'LIBRARY_ITEM_IN_USE',
      usage: { communities: 3, references: 7 },
    });
  });

  it('maps LibraryImportPlanChangedError to 409 with planHash', () => {
    const exc = toLibraryHttpException(
      new LibraryImportPlanChangedError('sha256:abc'),
    );
    expect(exc.getStatus()).toBe(409);
    expect(exc.getResponse()).toMatchObject({
      statusCode: 409,
      code: 'LIBRARY_IMPORT_PLAN_CHANGED',
      planHash: 'sha256:abc',
    });
  });

  it('maps LibraryBusyError to 409', () => {
    const exc = toLibraryHttpException(new LibraryBusyError());
    expect(exc.getStatus()).toBe(409);
    expect(exc.getResponse()).toMatchObject({
      statusCode: 409,
      code: 'LIBRARY_BUSY',
    });
  });

  it('passes existing HttpException through', () => {
    const original = new BadRequestException('Existing bad request');
    const exc = toLibraryHttpException(original);
    expect(exc).toBe(original);
  });

  it('falls back to 500 for unknown errors', () => {
    const exc = toLibraryHttpException(new Error('Unknown crash'));
    expect(exc.getStatus()).toBe(500);
  });
});
