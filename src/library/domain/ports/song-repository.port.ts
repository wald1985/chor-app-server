import { LibrarySong } from '../entities/library-song.entity';

export interface SongRepository {
  findById(id: string): Promise<LibrarySong | null>;
  findByScope(
    numberScopeId: string,
    numberKey: string,
  ): Promise<LibrarySong | null>;
  listByBookIds(
    bookIds: string[],
    options?: { includeArchived?: boolean },
  ): Promise<LibrarySong[]>;
  findByIds(ids: string[]): Promise<LibrarySong[]>;
  findNumberKeys(numberScopeId: string): Promise<string[]>;
  save(song: LibrarySong): Promise<void>;
  create(song: LibrarySong): Promise<void>;
  saveMany(songs: LibrarySong[]): Promise<void>;
  createMany(songs: LibrarySong[]): Promise<void>;
  rescope(bookId: string, newScopeId: string): Promise<void>;
  countActiveSongsByTheme(): Promise<Map<string, number>>;
}

export const SONG_REPOSITORY = Symbol('SONG_REPOSITORY');
