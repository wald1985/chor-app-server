import { Inject, Injectable } from '@nestjs/common';
import { SONG_LOOKUP, type SongLookup } from '../../../repertoire';
import type {
  SongReference,
  SongResolver,
} from '../../domain/ports/song-resolver.port';

interface LookedUpSong {
  id: string;
  number: string;
  title: string;
  source: string;
  container: { id: string; title: string; type: 'BOOK' | 'FOLDER' };
  archived: boolean;
}

const toReference = (song: LookedUpSong): SongReference => ({
  id: song.id,
  number: song.number,
  title: song.title,
  source: song.source === 'LIBRARY' ? 'LIBRARY' : 'COMMUNITY',
  container: {
    id: song.container.id,
    title: song.container.title,
    type: song.container.type,
  },
  archived: song.archived,
});

/** Adapts Repertoire's exported `SongLookup` port to this module's `SongResolver`. */
@Injectable()
export class RepertoireSongResolver implements SongResolver {
  constructor(@Inject(SONG_LOOKUP) private readonly lookup: SongLookup) {}

  async findActive(
    communityId: string,
    songId: string,
  ): Promise<SongReference | null> {
    const song = await this.lookup.lookup(communityId, songId);
    return song ? toReference(song) : null;
  }

  async findManyForHistory(
    communityId: string,
    songIds: string[],
  ): Promise<SongReference[]> {
    const songs = await this.lookup.lookupMany(communityId, songIds, {
      includeInactive: true,
    });
    return songs.map(toReference);
  }
}
