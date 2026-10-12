export interface PerformanceSongView {
  id: string;
  number: string;
  title: string;
  source: 'LIBRARY' | 'COMMUNITY';
  container: { id: string; title: string; type: 'BOOK' | 'FOLDER' };
  archived: boolean;
}

export interface PerformancePersonView {
  id: string;
  name: string;
  archived: boolean;
}

export interface PerformanceView {
  id: string;
  date: string;
  /** `null` only if the song can no longer be resolved at all. */
  song: PerformanceSongView | null;
  songId: string;
  pianist: PerformancePersonView | null;
  conductor: PerformancePersonView | null;
  note: string | null;
  createdAt: Date | undefined;
}
