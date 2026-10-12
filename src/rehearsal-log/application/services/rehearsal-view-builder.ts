import { Inject, Injectable } from '@nestjs/common';
import { RehearsalEntry } from '../../domain/entities/rehearsal-entry.entity';
import { Rehearsal } from '../../domain/entities/rehearsal.entity';
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
  RehearsalDetailView,
  RehearsalEntryView,
  RehearsalPersonView,
  RehearsalSongView,
  RehearsalSummaryView,
} from '../views/rehearsal.views';

const toPersonView = (
  person: PersonReference | undefined,
): RehearsalPersonView | null =>
  person
    ? { id: person.id, name: person.name, archived: person.archived }
    : null;

const toSongView = (
  song: SongReference | undefined,
): RehearsalSongView | null =>
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
export class RehearsalViewBuilder {
  constructor(
    @Inject(SONG_RESOLVER) private readonly songs: SongResolver,
    @Inject(PERSON_RESOLVER) private readonly people: PersonResolver,
  ) {}

  async summaries(
    communityId: string,
    items: { rehearsal: Rehearsal; entryCount: number }[],
  ): Promise<RehearsalSummaryView[]> {
    const leaders = await this.loadPeople(
      communityId,
      items.map((i) => i.rehearsal.warmUpLeaderId),
    );
    return items.map(({ rehearsal, entryCount }) =>
      this.summary(rehearsal, entryCount, leaders),
    );
  }

  async detail(
    communityId: string,
    rehearsal: Rehearsal,
    entries: RehearsalEntry[],
  ): Promise<RehearsalDetailView> {
    const [people, songs] = await Promise.all([
      this.loadPeople(communityId, [
        rehearsal.warmUpLeaderId,
        ...entries.flatMap((e) => [e.pianistId, e.conductorId]),
      ]),
      this.loadSongs(communityId, entries),
    ]);
    return {
      ...this.summary(rehearsal, entries.length, people),
      entries: entries.map((entry) => this.entryView(entry, songs, people)),
    };
  }

  async entry(
    communityId: string,
    entry: RehearsalEntry,
  ): Promise<RehearsalEntryView> {
    const [people, songs] = await Promise.all([
      this.loadPeople(communityId, [entry.pianistId, entry.conductorId]),
      this.loadSongs(communityId, [entry]),
    ]);
    return this.entryView(entry, songs, people);
  }

  private summary(
    rehearsal: Rehearsal,
    entryCount: number,
    people: Map<string, PersonReference>,
  ): RehearsalSummaryView {
    return {
      id: rehearsal.id,
      date: rehearsal.date.iso,
      warmUpLeader: toPersonView(people.get(rehearsal.warmUpLeaderId ?? '')),
      note: rehearsal.note,
      entryCount,
      createdAt: rehearsal.createdAt,
    };
  }

  private entryView(
    entry: RehearsalEntry,
    songs: Map<string, SongReference>,
    people: Map<string, PersonReference>,
  ): RehearsalEntryView {
    return {
      id: entry.id,
      songId: entry.songId,
      song: toSongView(songs.get(entry.songId)),
      pianist: toPersonView(people.get(entry.pianistId ?? '')),
      conductor: toPersonView(people.get(entry.conductorId ?? '')),
      note: entry.note,
      createdAt: entry.createdAt,
    };
  }

  private async loadPeople(
    communityId: string,
    ids: (string | null)[],
  ): Promise<Map<string, PersonReference>> {
    const unique = [...new Set(ids.filter((id): id is string => id !== null))];
    const found = await this.people.findMany(communityId, unique);
    return new Map(found.map((p) => [p.id, p]));
  }

  private async loadSongs(
    communityId: string,
    entries: RehearsalEntry[],
  ): Promise<Map<string, SongReference>> {
    const ids = [...new Set(entries.map((e) => e.songId))];
    const found = await this.songs.findManyForHistory(communityId, ids);
    return new Map(found.map((s) => [s.id, s]));
  }
}
