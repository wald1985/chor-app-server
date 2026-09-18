import { Injectable } from '@nestjs/common';
import { GetCommunitySongsUseCase } from '../use-cases/songs/get-community-songs.use-case';
import type { CommunitySongView } from '../views/repertoire.views';

export const SONG_LOOKUP = Symbol('SONG_LOOKUP');

export interface SongLookup {
  lookup(
    communityId: string,
    songId: string,
  ): Promise<CommunitySongView | null>;
}

@Injectable()
export class LookupCommunitySongQuery implements SongLookup {
  constructor(private readonly getCommunitySongs: GetCommunitySongsUseCase) {}

  async lookup(
    communityId: string,
    songId: string,
  ): Promise<CommunitySongView | null> {
    const songs = await this.getCommunitySongs.execute({
      communityId,
      songId,
    });
    return songs[0] ?? null;
  }
}
