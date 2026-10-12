import { Injectable } from '@nestjs/common';
import { GetCommunitySongsUseCase } from '../use-cases/songs/get-community-songs.use-case';
import type { CommunitySongView } from '../views/repertoire.views';

export const SONG_LOOKUP = Symbol('SONG_LOOKUP');

export interface SongLookupOptions {
  /**
   * Also resolve archived songs and songs of detached books. Use it to show
   * history; omit it to decide whether a song may be used for new data.
   */
  includeInactive?: boolean;
}

export interface SongLookup {
  lookup(
    communityId: string,
    songId: string,
    options?: SongLookupOptions,
  ): Promise<CommunitySongView | null>;
  /** Resolves many songs with one repertoire load; unknown ids are omitted. */
  lookupMany(
    communityId: string,
    songIds: string[],
    options?: SongLookupOptions,
  ): Promise<CommunitySongView[]>;
}

@Injectable()
export class LookupCommunitySongQuery implements SongLookup {
  constructor(private readonly getCommunitySongs: GetCommunitySongsUseCase) {}

  async lookup(
    communityId: string,
    songId: string,
    options?: SongLookupOptions,
  ): Promise<CommunitySongView | null> {
    const songs = await this.getCommunitySongs.execute({
      communityId,
      songId,
      ...(options?.includeInactive ? { includeInactive: true } : {}),
    });
    return songs[0] ?? null;
  }

  async lookupMany(
    communityId: string,
    songIds: string[],
    options?: SongLookupOptions,
  ): Promise<CommunitySongView[]> {
    if (songIds.length === 0) {
      return [];
    }
    return this.getCommunitySongs.execute({
      communityId,
      songIds,
      includeInactive: options?.includeInactive ?? false,
    });
  }
}
