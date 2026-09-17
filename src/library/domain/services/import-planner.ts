import { LibraryBook } from '../entities/library-book.entity';
import { LibrarySeries } from '../entities/library-series.entity';
import { LibrarySong } from '../entities/library-song.entity';
import { LibraryTheme } from '../entities/library-theme.entity';
import { LibraryTitle } from '../value-objects/library-title';
import { OptionalText } from '../value-objects/optional-text';
import { SongNumber } from '../value-objects/song-number';
import { SongTitle } from '../value-objects/song-title';
import { ThemeName } from '../value-objects/theme-name';
import { Volume } from '../value-objects/volume';
import { ImportPlan } from './import-plan';
import type {
  ParsedBook,
  ParsedLibraryFile,
  ParsedSong,
  PlanBookItem,
  PlanError,
  PlanSeriesItem,
  PlanSongItem,
  PlanThemeItem,
} from './import-plan';

export interface CatalogSnapshot {
  series: LibrarySeries[];
  books: LibraryBook[];
  themes: LibraryTheme[];
  songs: LibrarySong[];
}

interface SongPlanContext {
  bookId: string;
  fileBookIds: Set<string>;
  themesMap: Map<string, { id: string; name: string }>;
  errors: PlanError[];
}

export function validateParsedFile(file: ParsedLibraryFile): PlanError[] {
  const errors: PlanError[] = [];
  let totalSongs = 0;
  for (const book of file.books) {
    totalSongs += book.songs.length;
  }
  if (totalSongs > 20000) {
    errors.push({
      code: 'TOO_MANY_ROWS',
      message: 'File contains more than 20,000 songs',
    });
    return errors;
  }

  const volumeMap = new Map<string, string>();
  const bookPlacementMap = new Map<
    string,
    { series: string | null; volume: number | null }
  >();

  for (const book of file.books) {
    validateBookHeaders(book, errors, volumeMap, bookPlacementMap);
    if (errors.length >= 200) return errors.slice(0, 200);
  }

  validateSongs(file.books, errors);
  return errors.slice(0, 200);
}

function validateBookHeaders(
  book: ParsedBook,
  errors: PlanError[],
  volumeMap: Map<string, string>,
  placementMap: Map<string, { series: string | null; volume: number | null }>,
): void {
  validateBookTitle(book, errors);
  const placementValid = validatePlacementConsistency(
    book,
    errors,
    placementMap,
  );
  if (!placementValid) return;

  validatePlacementVOs(book, errors);
  checkDuplicateVolumeInFile(book, errors, volumeMap);
}

function validateBookTitle(book: ParsedBook, errors: PlanError[]): void {
  if (!book.title || book.title.trim() === '') {
    errors.push({
      code: 'VALUE_REQUIRED',
      message: 'Book title is required',
      ...book.source,
    });
  } else {
    tryValidation(
      () => new LibraryTitle(book.title),
      'title',
      book.source,
      errors,
    );
  }
}

function validatePlacementConsistency(
  book: ParsedBook,
  errors: PlanError[],
  placementMap: Map<string, { series: string | null; volume: number | null }>,
): boolean {
  const hasSeries = book.series !== null && book.series !== '';
  const hasVolume = book.volume !== null;

  if (hasSeries !== hasVolume) {
    errors.push({
      code: 'BOOK_PLACEMENT_INCONSISTENT',
      message: 'Series and volume must both be set or both be empty',
      ...book.source,
    });
    return false;
  }

  const bKey = safeKey(() => new LibraryTitle(book.title).key);
  if (bKey) {
    const prev = placementMap.get(bKey);
    if (prev && (prev.series !== book.series || prev.volume !== book.volume)) {
      errors.push({
        code: 'BOOK_PLACEMENT_INCONSISTENT',
        message: `Inconsistent series/volume for book '${book.title}'`,
        ...book.source,
      });
      return false;
    }
    placementMap.set(bKey, { series: book.series, volume: book.volume });
  }
  return true;
}

function validatePlacementVOs(book: ParsedBook, errors: PlanError[]): void {
  if (book.series !== null && book.series !== '') {
    tryValidation(
      () => new LibraryTitle(book.series!),
      'series',
      book.source,
      errors,
    );
  }
  if (book.volume !== null) {
    tryValidation(
      () => new Volume(book.volume!),
      'volume',
      book.source,
      errors,
    );
  }
}

function checkDuplicateVolumeInFile(
  book: ParsedBook,
  errors: PlanError[],
  volumeMap: Map<string, string>,
): void {
  if (!book.series || book.volume === null || !book.title) return;
  const sKey = safeKey(() => new LibraryTitle(book.series!).key);
  const bKey = safeKey(() => new LibraryTitle(book.title).key);
  if (!sKey || !bKey) return;

  const volKey = `${sKey}:${book.volume}`;
  const existingBookKey = volumeMap.get(volKey);
  if (existingBookKey && existingBookKey !== bKey) {
    errors.push({
      code: 'DUPLICATE_VOLUME',
      message: `Duplicate volume ${book.volume} in series ${book.series}`,
      ...book.source,
    });
  } else {
    volumeMap.set(volKey, bKey);
  }
}

function validateSongs(books: ParsedBook[], errors: PlanError[]): void {
  const seenNumbersByScope = new Map<string, Set<string>>();

  for (const book of books) {
    const scopeKey = getBookScopeKey(book);
    if (!seenNumbersByScope.has(scopeKey)) {
      seenNumbersByScope.set(scopeKey, new Set());
    }
    const scopeNumbers = seenNumbersByScope.get(scopeKey)!;

    for (const song of book.songs) {
      validateSingleSong(song, scopeNumbers, errors);
      if (errors.length >= 200) return;
    }
  }
}

function getBookScopeKey(book: ParsedBook): string {
  if (book.series && book.series.trim() !== '') {
    return safeKey(() => new LibraryTitle(book.series!).key) ?? book.series;
  }
  if (book.title && book.title.trim() !== '') {
    return safeKey(() => new LibraryTitle(book.title).key) ?? book.title;
  }
  return '';
}

function validateSingleSong(
  song: ParsedSong,
  scopeNumbers: Set<string>,
  errors: PlanError[],
): void {
  validateSongNumber(song, scopeNumbers, errors);
  validateSongTexts(song, errors);
  validateSongThemes(song, errors);
}

function validateSongNumber(
  song: ParsedSong,
  scopeNumbers: Set<string>,
  errors: PlanError[],
): void {
  if (!song.number || song.number.toString().trim() === '') {
    errors.push({
      code: 'VALUE_REQUIRED',
      message: 'Song number is required',
      ...song.source,
    });
    return;
  }
  try {
    const numVo = new SongNumber(song.number);
    if (scopeNumbers.has(numVo.key)) {
      errors.push({
        code: 'DUPLICATE_NUMBER',
        message: `Duplicate song number ${song.number} in numbering scope`,
        ...song.source,
      });
    } else {
      scopeNumbers.add(numVo.key);
    }
  } catch {
    errors.push({
      code: 'VALUE_INVALID',
      message: 'Invalid song number',
      ...song.source,
    });
  }
}

function validateSongTexts(song: ParsedSong, errors: PlanError[]): void {
  if (!song.title || song.title.trim() === '') {
    errors.push({
      code: 'VALUE_REQUIRED',
      message: 'Song title is required',
      ...song.source,
    });
  } else {
    tryValidation(
      () => new SongTitle(song.title),
      'title',
      song.source,
      errors,
    );
  }
  if (song.author) {
    tryValidation(
      () => new OptionalText(song.author, 'author'),
      'author',
      song.source,
      errors,
    );
  }
  if (song.arranger) {
    tryValidation(
      () => new OptionalText(song.arranger, 'arranger'),
      'arranger',
      song.source,
      errors,
    );
  }
}

function validateSongThemes(song: ParsedSong, errors: PlanError[]): void {
  for (const theme of song.themes) {
    if (theme.includes('|')) {
      errors.push({
        code: 'VALUE_INVALID',
        message: 'Theme name cannot contain |',
        ...song.source,
      });
    } else {
      tryValidation(() => new ThemeName(theme), 'theme', song.source, errors);
    }
  }
}

function tryValidation(
  fn: () => unknown,
  field: string,
  source: { row?: number; column?: string; path?: string },
  errors: PlanError[],
): void {
  try {
    fn();
  } catch {
    errors.push({
      code: 'VALUE_INVALID',
      message: `Invalid value for ${field}`,
      ...source,
    });
  }
}

function safeKey(fn: () => string): string | null {
  try {
    return fn();
  } catch {
    return null;
  }
}

export class ImportPlanner {
  static plan(file: ParsedLibraryFile, snapshot: CatalogSnapshot): ImportPlan {
    const fileErrors = validateParsedFile(file);
    if (fileErrors.length > 0) {
      return new ImportPlan([], [], [], [], fileErrors);
    }

    const { items: plannedSeries, map: seriesMap } = planSeries(
      file.books,
      snapshot.series,
    );
    const {
      items: plannedBooks,
      map: booksMap,
      errors: bookErrors,
    } = planBooks(file.books, snapshot.books, seriesMap);
    const { items: plannedThemes, map: themesMap } = planThemes(
      file.books,
      snapshot.themes,
    );
    const { items: plannedSongs, errors: songErrors } = planSongs(
      file.books,
      snapshot,
      booksMap,
      themesMap,
    );

    const allErrors = [...bookErrors, ...songErrors];
    return new ImportPlan(
      plannedSeries,
      plannedBooks,
      plannedThemes,
      plannedSongs,
      allErrors,
    );
  }
}

function planSeries(
  books: ParsedBook[],
  existingSeries: LibrarySeries[],
): {
  items: PlanSeriesItem[];
  map: Map<string, { id: string; title: string }>;
} {
  const existingMap = new Map<string, LibrarySeries>();
  for (const s of existingSeries) {
    existingMap.set(s.titleKey, s);
  }

  const itemsMap = new Map<string, PlanSeriesItem>();
  const resultMap = new Map<string, { id: string; title: string }>();

  for (const book of books) {
    if (!book.series || book.series.trim() === '') continue;
    const titleVo = new LibraryTitle(book.series);
    if (itemsMap.has(titleVo.key)) continue;

    const existing = existingMap.get(titleVo.key);
    if (existing) {
      const action = existing.isArchived ? 'RESTORE' : 'UNCHANGED';
      itemsMap.set(titleVo.key, {
        action,
        id: existing.id,
        title: existing.title.value,
        titleKey: existing.titleKey,
      });
      resultMap.set(titleVo.key, {
        id: existing.id,
        title: existing.title.value,
      });
    } else {
      const tempId = `series:${titleVo.key}`;
      itemsMap.set(titleVo.key, {
        action: 'CREATE',
        id: tempId,
        title: titleVo.value,
        titleKey: titleVo.key,
      });
      resultMap.set(titleVo.key, { id: tempId, title: titleVo.value });
    }
  }

  const items = Array.from(itemsMap.values()).sort((a, b) =>
    a.titleKey.localeCompare(b.titleKey),
  );
  return { items, map: resultMap };
}

interface BookPlanContext {
  existingBooks: LibraryBook[];
  fileBookKeys: Set<string>;
  seriesMap: Map<string, { id: string; title: string }>;
  errors: PlanError[];
}

function planBooks(
  books: ParsedBook[],
  existingBooks: LibraryBook[],
  seriesMap: Map<string, { id: string; title: string }>,
): {
  items: PlanBookItem[];
  map: Map<string, { id: string; title: string; seriesId: string | null }>;
  errors: PlanError[];
} {
  const existingMap = new Map<string, LibraryBook>();
  for (const b of existingBooks) existingMap.set(b.titleKey, b);

  const fileBookKeys = new Set<string>();
  for (const b of books) fileBookKeys.add(new LibraryTitle(b.title).key);

  const items: PlanBookItem[] = [];
  const resultMap = new Map<
    string,
    { id: string; title: string; seriesId: string | null }
  >();
  const errors: PlanError[] = [];

  const ctx: BookPlanContext = {
    existingBooks,
    fileBookKeys,
    seriesMap,
    errors,
  };

  for (const book of books) {
    planSingleBook(book, existingMap, ctx, items, resultMap);
  }

  items.sort((a, b) => a.titleKey.localeCompare(b.titleKey));
  return { items, map: resultMap, errors };
}

function planSingleBook(
  book: ParsedBook,
  existingMap: Map<string, LibraryBook>,
  ctx: BookPlanContext,
  items: PlanBookItem[],
  resultMap: Map<
    string,
    { id: string; title: string; seriesId: string | null }
  >,
): void {
  const titleVo = new LibraryTitle(book.title);
  const targetSeriesId = book.series
    ? (ctx.seriesMap.get(new LibraryTitle(book.series).key)?.id ?? null)
    : null;
  const targetVolume = book.volume ?? null;

  checkVolumeTaken(targetSeriesId, targetVolume, book, ctx);

  const existing = existingMap.get(titleVo.key);
  if (existing) {
    const item = planExistingBook(existing, targetSeriesId, targetVolume);
    items.push(item);
    resultMap.set(titleVo.key, {
      id: existing.id,
      title: existing.title.value,
      seriesId: targetSeriesId,
    });
  } else {
    const tempId = `book:${titleVo.key}`;
    items.push({
      action: 'CREATE',
      id: tempId,
      title: titleVo.value,
      titleKey: titleVo.key,
      seriesId: targetSeriesId,
      volume: targetVolume,
    });
    resultMap.set(titleVo.key, {
      id: tempId,
      title: titleVo.value,
      seriesId: targetSeriesId,
    });
  }
}

function checkVolumeTaken(
  seriesId: string | null,
  volume: number | null,
  book: ParsedBook,
  ctx: BookPlanContext,
): void {
  if (!seriesId || volume === null) return;
  const takenBy = ctx.existingBooks.find(
    (b) =>
      b.seriesId === seriesId &&
      b.volumeValue === volume &&
      !ctx.fileBookKeys.has(b.titleKey),
  );
  if (takenBy) {
    ctx.errors.push({
      code: 'VOLUME_TAKEN',
      message: `Volume ${volume} is already taken by book '${takenBy.title.value}' outside the file`,
      ...book.source,
    });
  }
}

function planExistingBook(
  existing: LibraryBook,
  targetSeriesId: string | null,
  targetVolume: number | null,
): PlanBookItem {
  const placementChanged =
    existing.seriesId !== targetSeriesId ||
    existing.volumeValue !== targetVolume;
  let action: 'RESTORE' | 'PLACE' | 'UNCHANGED' = 'UNCHANGED';
  if (existing.isArchived) {
    action = 'RESTORE';
  } else if (placementChanged) {
    action = 'PLACE';
  }
  return {
    action,
    id: existing.id,
    title: existing.title.value,
    titleKey: existing.titleKey,
    seriesId: targetSeriesId,
    volume: targetVolume,
    oldSeriesId: existing.seriesId,
    oldVolume: existing.volumeValue,
  };
}

function planThemes(
  books: ParsedBook[],
  existingThemes: LibraryTheme[],
): {
  items: PlanThemeItem[];
  map: Map<string, { id: string; name: string }>;
} {
  const existingMap = new Map<string, LibraryTheme>();
  for (const t of existingThemes) existingMap.set(t.nameKey, t);

  const rawThemeNames = extractUniqueThemeNames(books);
  const itemsMap = new Map<string, PlanThemeItem>();
  const resultMap = new Map<string, { id: string; name: string }>();

  for (const tName of rawThemeNames) {
    const themeVo = new ThemeName(tName);
    if (itemsMap.has(themeVo.key)) continue;

    const existing = existingMap.get(themeVo.key);
    if (existing) {
      const action = existing.isArchived ? 'RESTORE' : 'UNCHANGED';
      itemsMap.set(themeVo.key, {
        action,
        id: existing.id,
        name: existing.name.value,
        nameKey: existing.nameKey,
      });
      resultMap.set(themeVo.key, {
        id: existing.id,
        name: existing.name.value,
      });
    } else {
      const tempId = `theme:${themeVo.key}`;
      itemsMap.set(themeVo.key, {
        action: 'CREATE',
        id: tempId,
        name: themeVo.value,
        nameKey: themeVo.key,
      });
      resultMap.set(themeVo.key, { id: tempId, name: themeVo.value });
    }
  }

  const items = Array.from(itemsMap.values()).sort((a, b) =>
    a.nameKey.localeCompare(b.nameKey),
  );
  return { items, map: resultMap };
}

function extractUniqueThemeNames(books: ParsedBook[]): string[] {
  const names: string[] = [];
  for (const book of books) {
    for (const song of book.songs) {
      names.push(...song.themes);
    }
  }
  return names;
}

function planSongs(
  books: ParsedBook[],
  snapshot: CatalogSnapshot,
  booksMap: Map<string, { id: string; title: string; seriesId: string | null }>,
  themesMap: Map<string, { id: string; name: string }>,
): { items: PlanSongItem[]; errors: PlanError[] } {
  const items: PlanSongItem[] = [];
  const errors: PlanError[] = [];

  const fileBookKeys = new Set(books.map((b) => new LibraryTitle(b.title).key));
  const fileBookIds = new Set<string>();
  for (const b of snapshot.books) {
    if (fileBookKeys.has(b.titleKey)) fileBookIds.add(b.id);
  }

  const songsByScope = buildSongsByScope(snapshot, booksMap);
  const claimedSongIds = new Set<string>();

  for (const book of books) {
    const bInfo = booksMap.get(new LibraryTitle(book.title).key)!;
    const targetScopeId = bInfo.seriesId ?? bInfo.id;
    const scopeSongs =
      songsByScope.get(targetScopeId) ?? new Map<string, LibrarySong>();
    const ctx: SongPlanContext = {
      bookId: bInfo.id,
      fileBookIds,
      themesMap,
      errors,
    };
    planSongsForBook(book, scopeSongs, ctx, items, claimedSongIds);
  }

  for (const book of books) {
    const bInfo = booksMap.get(new LibraryTitle(book.title).key)!;
    planArchivedSongs(bInfo.id, snapshot.songs, claimedSongIds, items);
  }

  items.sort(
    (a, b) =>
      a.bookId.localeCompare(b.bookId) || a.sortKey.localeCompare(b.sortKey),
  );
  return { items, errors };
}

function planSongsForBook(
  book: ParsedBook,
  scopeSongs: Map<string, LibrarySong>,
  ctx: SongPlanContext,
  items: PlanSongItem[],
  claimedSongIds: Set<string>,
): void {
  for (const song of book.songs) {
    const numVo = new SongNumber(song.number);
    const existing = scopeSongs.get(numVo.key);
    const songPlan = planSingleSong(song, numVo, existing, ctx);
    if (songPlan) {
      items.push(songPlan);
    }
    if (songPlan && existing) {
      claimedSongIds.add(existing.id);
    }
  }
}

function buildSongsByScope(
  snapshot: CatalogSnapshot,
  booksMap: Map<string, { id: string; title: string; seriesId: string | null }>,
): Map<string, Map<string, LibrarySong>> {
  const map = new Map<string, Map<string, LibrarySong>>();
  const booksById = new Map<string, LibraryBook>();
  for (const b of snapshot.books) booksById.set(b.id, b);

  for (const s of snapshot.songs) {
    const book = booksById.get(s.bookId);
    if (!book) continue;

    const plannedPlacement = booksMap.get(book.titleKey);
    const postScopeId = plannedPlacement
      ? (plannedPlacement.seriesId ?? plannedPlacement.id)
      : book.numberScopeId();

    if (!map.has(postScopeId)) map.set(postScopeId, new Map());
    map.get(postScopeId)!.set(s.numberKey, s);
  }
  return map;
}

function planSingleSong(
  song: ParsedSong,
  numVo: SongNumber,
  existing: LibrarySong | undefined,
  ctx: SongPlanContext,
): PlanSongItem | null {
  const themeIds = song.themes
    .map((t) => ctx.themesMap.get(new ThemeName(t).key)!.id)
    .sort();

  if (!existing) {
    return {
      action: 'CREATE',
      bookId: ctx.bookId,
      number: numVo.value,
      numberKey: numVo.key,
      sortKey: numVo.sortKey,
      title: new SongTitle(song.title).value,
      author: song.author
        ? new OptionalText(song.author, 'author').value
        : null,
      arranger: song.arranger
        ? new OptionalText(song.arranger, 'arranger').value
        : null,
      themeIds,
    };
  }

  if (existing.bookId !== ctx.bookId && !ctx.fileBookIds.has(existing.bookId)) {
    ctx.errors.push({
      code: 'NUMBER_SCOPE_CONFLICT',
      message: `Song number ${song.number} belongs to book outside the import file`,
      ...song.source,
    });
    return null;
  }

  return planExistingSong(song, numVo, ctx.bookId, existing, themeIds);
}

function planExistingSong(
  song: ParsedSong,
  numVo: SongNumber,
  bookId: string,
  existing: LibrarySong,
  themeIds: string[],
): PlanSongItem {
  const titleVal = new SongTitle(song.title).value;
  const authorVal = song.author
    ? new OptionalText(song.author, 'author').value
    : null;
  const arrangerVal = song.arranger
    ? new OptionalText(song.arranger, 'arranger').value
    : null;

  const changes = detectSongChanges(
    existing,
    titleVal,
    authorVal,
    arrangerVal,
    themeIds,
  );
  const action = determineSongAction(existing, bookId, changes.length > 0);

  return {
    action,
    id: existing.id,
    bookId,
    oldBookId: existing.bookId !== bookId ? existing.bookId : undefined,
    number: numVo.value,
    numberKey: numVo.key,
    sortKey: numVo.sortKey,
    title: titleVal,
    author: authorVal,
    arranger: arrangerVal,
    themeIds,
    changes: changes.length > 0 ? changes : undefined,
  };
}

function detectSongChanges(
  existing: LibrarySong,
  titleVal: string,
  authorVal: string | null,
  arrangerVal: string | null,
  themeIds: string[],
): string[] {
  const changes: string[] = [];
  if (existing.titleValue !== titleVal) changes.push('title');
  if (existing.authorValue !== authorVal) changes.push('author');
  if (existing.arrangerValue !== arrangerVal) changes.push('arranger');
  if (areThemesDifferent(existing.themeIds, themeIds)) changes.push('themes');
  return changes;
}

function determineSongAction(
  existing: LibrarySong,
  bookId: string,
  hasChanges: boolean,
): 'MOVE' | 'RESTORE' | 'UPDATE' | 'UNCHANGED' {
  if (existing.bookId !== bookId) {
    return 'MOVE';
  }
  if (existing.isArchived) {
    return 'RESTORE';
  }
  if (hasChanges) {
    return 'UPDATE';
  }
  return 'UNCHANGED';
}

function areThemesDifferent(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return true;
  const set = new Set(a);
  return b.some((id) => !set.has(id));
}

function planArchivedSongs(
  bookId: string,
  allSongs: LibrarySong[],
  claimedSongIds: Set<string>,
  items: PlanSongItem[],
): void {
  for (const s of allSongs) {
    if (s.bookId === bookId && !s.isArchived && !claimedSongIds.has(s.id)) {
      items.push({
        action: 'ARCHIVE',
        id: s.id,
        bookId,
        number: s.numberValue,
        numberKey: s.numberKey,
        sortKey: s.sortKey,
        title: s.titleValue,
        author: s.authorValue,
        arranger: s.arrangerValue,
        themeIds: [...s.themeIds].sort(),
      });
    }
  }
}
