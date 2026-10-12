import { Inject, Injectable } from '@nestjs/common';
import {
  ReferencedPersonArchivedError,
  ReferencedPersonNotFoundError,
  ReferencedPersonRoleMismatchError,
  ReferencedSongNotFoundError,
} from '../../domain/errors/performance-log.errors';
import {
  PERSON_RESOLVER,
  type LogPersonRole,
  type PersonResolver,
} from '../../domain/ports/person-resolver.port';
import {
  SONG_RESOLVER,
  type SongResolver,
} from '../../domain/ports/song-resolver.port';

/** Checks the songs and people a new Performance points at (validate on write). */
@Injectable()
export class ReferenceValidator {
  constructor(
    @Inject(SONG_RESOLVER) private readonly songs: SongResolver,
    @Inject(PERSON_RESOLVER) private readonly people: PersonResolver,
  ) {}

  async assertSongUsable(communityId: string, songId: string): Promise<void> {
    const song = await this.songs.findActive(communityId, songId);
    if (!song || song.archived) {
      throw new ReferencedSongNotFoundError(songId);
    }
  }

  /** Each person must be active, of this Community and hold the paired role. */
  async assertPeopleUsable(
    communityId: string,
    people: { id: string | null | undefined; role: LogPersonRole }[],
  ): Promise<void> {
    const wanted = people.filter(
      (p): p is { id: string; role: LogPersonRole } => Boolean(p.id),
    );
    if (wanted.length === 0) {
      return;
    }
    const found = await this.people.findMany(
      communityId,
      wanted.map((p) => p.id),
    );
    const byId = new Map(found.map((p) => [p.id, p]));
    for (const { id, role } of wanted) {
      const person = byId.get(id);
      if (!person) {
        throw new ReferencedPersonNotFoundError(id);
      }
      if (person.archived) {
        throw new ReferencedPersonArchivedError(id);
      }
      if (!person.roles.includes(role)) {
        throw new ReferencedPersonRoleMismatchError(id, role);
      }
    }
  }
}
