export interface RehearsalSongView {
  id: string;
  number: string;
  title: string;
  source: 'LIBRARY' | 'COMMUNITY';
  container: { id: string; title: string; type: 'BOOK' | 'FOLDER' };
  archived: boolean;
}

export interface RehearsalPersonView {
  id: string;
  name: string;
  archived: boolean;
}

export interface RehearsalSummaryView {
  id: string;
  date: string;
  warmUpLeader: RehearsalPersonView | null;
  note: string | null;
  entryCount: number;
  createdAt: Date | undefined;
}

export interface RehearsalEntryView {
  id: string;
  songId: string;
  /** `null` only if the song can no longer be resolved at all. */
  song: RehearsalSongView | null;
  pianist: RehearsalPersonView | null;
  conductor: RehearsalPersonView | null;
  note: string | null;
  createdAt: Date | undefined;
}

export interface RehearsalDetailView extends RehearsalSummaryView {
  entries: RehearsalEntryView[];
}
