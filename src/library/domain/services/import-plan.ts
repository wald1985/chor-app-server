import { createHash } from 'node:crypto';

export interface SourceRef {
  row?: number;
  column?: string;
  path?: string;
}

export interface ParsedSong {
  number: string;
  title: string;
  author: string | null;
  arranger: string | null;
  themes: string[];
  source: SourceRef;
}

export interface ParsedBook {
  title: string;
  series: string | null;
  volume: number | null;
  songs: ParsedSong[];
  source: SourceRef;
}

export interface ParsedLibraryFile {
  books: ParsedBook[];
}

export type PlanAction =
  'CREATE' | 'UPDATE' | 'MOVE' | 'RESTORE' | 'ARCHIVE' | 'PLACE' | 'UNCHANGED';

export interface PlanSeriesItem {
  action: 'CREATE' | 'RESTORE' | 'UNCHANGED';
  id?: string;
  title: string;
  titleKey: string;
}

export interface PlanBookItem {
  action: 'CREATE' | 'RESTORE' | 'PLACE' | 'UNCHANGED';
  id?: string;
  title: string;
  titleKey: string;
  seriesId: string | null;
  volume: number | null;
  oldSeriesId?: string | null;
  oldVolume?: number | null;
}

export interface PlanThemeItem {
  action: 'CREATE' | 'RESTORE' | 'UNCHANGED';
  id?: string;
  name: string;
  nameKey: string;
}

export interface PlanSongItem {
  action: 'CREATE' | 'UPDATE' | 'MOVE' | 'RESTORE' | 'ARCHIVE' | 'UNCHANGED';
  id?: string;
  bookId: string;
  number: string;
  numberKey: string;
  sortKey: string;
  title: string;
  author: string | null;
  arranger: string | null;
  themeIds: string[];
  oldBookId?: string;
  changes?: string[];
}

export interface PlanError {
  code: string;
  message: string;
  row?: number;
  column?: string;
  path?: string;
}

export interface ImportPlanSummary {
  seriesCreated: number;
  seriesRestored: number;
  seriesUnchanged: number;
  booksCreated: number;
  booksRestored: number;
  booksPlaced: number;
  booksUnchanged: number;
  themesCreated: number;
  themesRestored: number;
  themesUnchanged: number;
  songsCreated: number;
  songsUpdated: number;
  songsMoved: number;
  songsRestored: number;
  songsArchived: number;
  songsUnchanged: number;
  totalErrors: number;
}

export interface ArchivedItemRef {
  type: 'BOOK' | 'SONG' | 'THEME';
  id: string;
}

function canonicalStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map((item) => canonicalStringify(item)).join(',')}]`;
  }
  const keys = Object.keys(obj).sort();
  const pairs = keys.map(
    (k) =>
      `${JSON.stringify(k)}:${canonicalStringify((obj as Record<string, unknown>)[k])}`,
  );
  return `{${pairs.join(',')}}`;
}

export class ImportPlan {
  constructor(
    public readonly series: PlanSeriesItem[],
    public readonly books: PlanBookItem[],
    public readonly themes: PlanThemeItem[],
    public readonly songs: PlanSongItem[],
    public readonly errors: PlanError[] = [],
  ) {}

  summary(): ImportPlanSummary {
    return {
      seriesCreated: this.count(this.series, 'CREATE'),
      seriesRestored: this.count(this.series, 'RESTORE'),
      seriesUnchanged: this.count(this.series, 'UNCHANGED'),
      booksCreated: this.count(this.books, 'CREATE'),
      booksRestored: this.count(this.books, 'RESTORE'),
      booksPlaced: this.count(this.books, 'PLACE'),
      booksUnchanged: this.count(this.books, 'UNCHANGED'),
      themesCreated: this.count(this.themes, 'CREATE'),
      themesRestored: this.count(this.themes, 'RESTORE'),
      themesUnchanged: this.count(this.themes, 'UNCHANGED'),
      songsCreated: this.count(this.songs, 'CREATE'),
      songsUpdated: this.count(this.songs, 'UPDATE'),
      songsMoved: this.count(this.songs, 'MOVE'),
      songsRestored: this.count(this.songs, 'RESTORE'),
      songsArchived: this.count(this.songs, 'ARCHIVE'),
      songsUnchanged: this.count(this.songs, 'UNCHANGED'),
      totalErrors: this.errors.length,
    };
  }

  archivedRefs(): ArchivedItemRef[] {
    const refs: ArchivedItemRef[] = [];
    for (const song of this.songs) {
      if (song.action === 'ARCHIVE' && song.id) {
        refs.push({ type: 'SONG', id: song.id });
      }
    }
    return refs;
  }

  hash(): string {
    const canonicalPayload = {
      series: this.series,
      books: this.books,
      themes: this.themes,
      songs: this.songs,
      errors: this.errors,
    };
    const json = canonicalStringify(canonicalPayload);
    return `sha256:${createHash('sha256').update(json).digest('hex')}`;
  }

  private count<T extends { action: string }>(
    items: T[],
    action: string,
  ): number {
    return items.filter((item) => item.action === action).length;
  }
}
