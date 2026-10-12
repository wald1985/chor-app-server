import { Inject, Injectable } from '@nestjs/common';
import { Performance } from '../../domain/entities/performance.entity';
import {
  PERSON_RESOLVER,
  type PersonReference,
  type PersonResolver,
} from '../../domain/ports/person-resolver.port';
import {
  SONG_RESOLVER,
  type SongReference,
  type SongResolver,
} from '../../domain/ports/song-resolver.port';
import type {
  PerformancePersonView,
  PerformanceSongView,
  PerformanceView,
} from '../views/performance.views';

const toPersonView = (
  person: PersonReference | undefined,
): PerformancePersonView | null =>
  person
    ? { id: person.id, name: person.name, archived: person.archived }
    : null;

const toSongView = (
  song: SongReference | undefined,
): PerformanceSongView | null =>
  song
    ? {
        id: song.id,
        number: song.number,
        title: song.title,
        source: song.source,
        container: song.container,
        archived: song.archived,
      }
    : null;

/** Resolves songs and people to current data (resolve on read), archived ones included. */
@Injectable()
export class PerformanceViewBuilder {
  constructor(
    @Inject(SONG_RESOLVER) private readonly songs: SongResolver,
    @Inject(PERSON_RESOLVER) private readonly people: PersonResolver,
  ) {}

  async build(
    communityId: string,
    performances: Performance[],
  ): Promise<PerformanceView[]> {
    if (performances.length === 0) {
      return [];
    }
    const songIds = [...new Set(performances.map((p) => p.songId))];
    const personIds = [
      ...new Set(
        performances
          .flatMap((p) => [p.pianistId, p.conductorId])
          .filter((id): id is string => id !== null),
      ),
    ];
    const [songs, people] = await Promise.all([
      this.songs.findManyForHistory(communityId, songIds),
      this.people.findMany(communityId, personIds),
    ]);
    const songById = new Map(songs.map((s) => [s.id, s]));
    const personById = new Map(people.map((p) => [p.id, p]));

    return performances.map((performance) => ({
      id: performance.id,
      date: performance.date.iso,
      songId: performance.songId,
      song: toSongView(songById.get(performance.songId)),
      pianist: toPersonView(personById.get(performance.pianistId ?? '')),
      conductor: toPersonView(personById.get(performance.conductorId ?? '')),
      note: performance.note,
      createdAt: performance.createdAt,
    }));
  }
}
