export const SONG_RESOLVER = Symbol('REHEARSAL_SONG_RESOLVER');

export interface SongReference {
  id: string;
  number: string;
  title: string;
  source: 'LIBRARY' | 'COMMUNITY';
  container: { id: string; title: string; type: 'BOOK' | 'FOLDER' };
  archived: boolean;
}

export interface SongResolver {
  /** The song if it may be used for new entries (visible and active), else null. */
  findActive(
    communityId: string,
    songId: string,
  ): Promise<SongReference | null>;
  /** Resolves songs for display, including archived ones and those of detached books. */
  findManyForHistory(
    communityId: string,
    songIds: string[],
  ): Promise<SongReference[]>;
}
