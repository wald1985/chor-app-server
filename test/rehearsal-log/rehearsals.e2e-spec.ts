import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { EMAIL_SENDER } from '../../src/notifications';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createAdmin, createMember, RegisteredAdmin } from '../utils/factories';
import { resetDb } from '../utils/reset-db';

interface EntryBody {
  id: string;
  songId: string;
  song: { title: string; archived: boolean } | null;
  pianist: { name: string; archived: boolean } | null;
  conductor: { name: string } | null;
  note: string | null;
}

interface RehearsalBody {
  id: string;
  date: string;
  warmUpLeader: { id: string; name: string } | null;
  note: string | null;
  entryCount: number;
  entries?: EntryBody[];
}

describe('Rehearsal log (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EMAIL_SENDER)
      .useValue({ send: jest.fn().mockResolvedValue(undefined) })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.use(cookieParser());
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDb(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const url = (communityId: string, suffix = '') =>
    `/communities/${communityId}/rehearsals${suffix}`;

  const createSong = async (admin: RegisteredAdmin, number = '1') => {
    const folderRes = await request(app.getHttpServer())
      .post(`/communities/${admin.communityId}/folders`)
      .set(auth(admin.token))
      .send({ title: `Mappe ${number}` })
      .expect(201);
    const folderId = (folderRes.body as { id: string }).id;
    const songRes = await request(app.getHttpServer())
      .post(`/communities/${admin.communityId}/folders/${folderId}/songs`)
      .set(auth(admin.token))
      .send({ number, title: `Lied ${number}` })
      .expect(201);
    return { folderId, songId: (songRes.body as { id: string }).id };
  };

  const createPerson = async (
    admin: RegisteredAdmin,
    name: string,
    roles: string[],
  ) => {
    const res = await request(app.getHttpServer())
      .post(`/communities/${admin.communityId}/people`)
      .set(auth(admin.token))
      .send({ name, roles })
      .expect(201);
    return (res.body as { id: string }).id;
  };

  const create = (
    admin: RegisteredAdmin,
    body: Record<string, unknown>,
    token = admin.token,
  ) =>
    request(app.getHttpServer())
      .post(url(admin.communityId))
      .set(auth(token))
      .send(body);

  const addEntry = (
    admin: RegisteredAdmin,
    rehearsalId: string,
    body: Record<string, unknown>,
    token = admin.token,
  ) =>
    request(app.getHttpServer())
      .post(url(admin.communityId, `/${rehearsalId}/entries`))
      .set(auth(token))
      .send(body);

  const fetchOne = (admin: RegisteredAdmin, id: string) =>
    request(app.getHttpServer())
      .get(url(admin.communityId, `/${id}`))
      .set(auth(admin.token));

  it('requires authentication', async () => {
    const admin = await createAdmin(app);
    await request(app.getHttpServer()).get(url(admin.communityId)).expect(401);
  });

  it('creates a rehearsal with a warm-up leader and note', async () => {
    const admin = await createAdmin(app);
    const leader = await createPerson(admin, 'Daniel', ['CONDUCTOR']);

    const res = await create(admin, {
      date: '2026-10-08',
      warmUpLeaderId: leader,
      note: ' Gemeindesaal ',
    }).expect(201);

    const body = res.body as RehearsalBody;
    expect(body.date).toBe('2026-10-08');
    expect(body.warmUpLeader?.name).toBe('Daniel');
    expect(body.note).toBe('Gemeindesaal');
    expect(body.entries).toEqual([]);
  });

  it('creates with only a date; rejects invalid dates and bad leaders', async () => {
    const admin = await createAdmin(app);
    const pianist = await createPerson(admin, 'Lorina', ['PIANIST']);

    await create(admin, { date: '2026-10-08' }).expect(201);
    await create(admin, { date: '2026-02-30' }).expect(400);
    await create(admin, {}).expect(400);
    const mismatch = await create(admin, {
      date: '2026-10-09',
      warmUpLeaderId: pianist,
    }).expect(400);
    expect(mismatch.body).toMatchObject({ code: 'PERSON_ROLE_MISMATCH' });
  });

  it('answers 409 with the existing rehearsal when the date is taken; other communities are independent', async () => {
    const admin = await createAdmin(app);
    const other = await createAdmin(app);
    const first = (await create(admin, { date: '2026-10-08' }).expect(201))
      .body as RehearsalBody;

    const conflict = await create(admin, { date: '2026-10-08' }).expect(409);
    expect(conflict.body).toMatchObject({
      code: 'REHEARSAL_DATE_TAKEN',
      existingRehearsalId: first.id,
    });

    await create(other, { date: '2026-10-08' }).expect(201);
  });

  it('allows only one rehearsal per date even when created concurrently', async () => {
    const admin = await createAdmin(app);
    const results = await Promise.all([
      create(admin, { date: '2026-10-08' }),
      create(admin, { date: '2026-10-08' }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  });

  it('changes and clears warm-up leader and note, never the date', async () => {
    const admin = await createAdmin(app);
    const leader = await createPerson(admin, 'Daniel', ['CONDUCTOR']);
    const created = (
      await create(admin, { date: '2026-10-08', note: 'alt' }).expect(201)
    ).body as RehearsalBody;
    const patch = (body: Record<string, unknown>) =>
      request(app.getHttpServer())
        .patch(url(admin.communityId, `/${created.id}`))
        .set(auth(admin.token))
        .send(body);

    const withLeader = await patch({ warmUpLeaderId: leader }).expect(200);
    expect((withLeader.body as RehearsalBody).warmUpLeader?.name).toBe(
      'Daniel',
    );
    expect((withLeader.body as RehearsalBody).note).toBe('alt');

    const cleared = await patch({ warmUpLeaderId: null, note: null }).expect(
      200,
    );
    expect((cleared.body as RehearsalBody).warmUpLeader).toBeNull();
    expect((cleared.body as RehearsalBody).note).toBeNull();

    const ignored = await patch({ date: '2030-01-01' }).expect(200);
    expect((ignored.body as RehearsalBody).date).toBe('2026-10-08');
  });

  it('adds entries in order, allows the same song twice, resolves people', async () => {
    const admin = await createAdmin(app);
    const one = await createSong(admin, '1');
    const two = await createSong(admin, '2');
    const pianist = await createPerson(admin, 'Lorina', ['PIANIST']);
    const conductor = await createPerson(admin, 'Daniel', ['CONDUCTOR']);
    const rehearsal = (await create(admin, { date: '2026-10-08' }).expect(201))
      .body as RehearsalBody;

    await addEntry(admin, rehearsal.id, {
      songId: one.songId,
      pianistId: pianist,
      conductorId: conductor,
    }).expect(201);
    await addEntry(admin, rehearsal.id, {
      songId: two.songId,
      note: 'zweite Strophe',
    }).expect(201);
    await addEntry(admin, rehearsal.id, { songId: one.songId }).expect(201);

    const detail = (await fetchOne(admin, rehearsal.id).expect(200))
      .body as RehearsalBody;
    expect(detail.entryCount).toBe(3);
    expect(detail.entries?.map((e) => e.song?.title)).toEqual([
      'Lied 1',
      'Lied 2',
      'Lied 1',
    ]);
    expect(detail.entries?.[0].pianist?.name).toBe('Lorina');
    expect(detail.entries?.[0].conductor?.name).toBe('Daniel');
    expect(detail.entries?.[1].note).toBe('zweite Strophe');
  });

  it('rejects unusable songs and people when adding an entry', async () => {
    const admin = await createAdmin(app);
    const other = await createAdmin(app);
    const own = await createSong(admin);
    const foreign = await createSong(other);
    const pianist = await createPerson(admin, 'Lorina', ['PIANIST']);
    const gone = await createPerson(admin, 'Springer', ['CONDUCTOR']);
    await request(app.getHttpServer())
      .post(`/communities/${admin.communityId}/people/${gone}/archive`)
      .set(auth(admin.token))
      .expect(200);
    const rehearsal = (await create(admin, { date: '2026-10-08' }).expect(201))
      .body as RehearsalBody;

    await addEntry(admin, rehearsal.id, { songId: foreign.songId }).expect(400);
    await addEntry(admin, rehearsal.id, {
      songId: own.songId,
      conductorId: pianist,
    }).expect(400);
    const archived = await addEntry(admin, rehearsal.id, {
      songId: own.songId,
      conductorId: gone,
    }).expect(400);
    expect(archived.body).toMatchObject({ code: 'PERSON_ARCHIVED' });

    const detail = (await fetchOne(admin, rehearsal.id).expect(200))
      .body as RehearsalBody;
    expect(detail.entryCount).toBe(0);
  });

  it('removes an entry, keeps order, and 404s for foreign ids', async () => {
    const admin = await createAdmin(app);
    const other = await createAdmin(app);
    const song = await createSong(admin);
    const rehearsal = (await create(admin, { date: '2026-10-08' }).expect(201))
      .body as RehearsalBody;
    const otherRehearsal = (
      await create(other, { date: '2026-10-08' }).expect(201)
    ).body as RehearsalBody;
    const first = (
      await addEntry(admin, rehearsal.id, { songId: song.songId, note: 'a' })
    ).body as EntryBody;
    const second = (
      await addEntry(admin, rehearsal.id, { songId: song.songId, note: 'b' })
    ).body as EntryBody;
    await addEntry(admin, rehearsal.id, { songId: song.songId, note: 'c' });

    await request(app.getHttpServer())
      .delete(
        url(other.communityId, `/${otherRehearsal.id}/entries/${first.id}`),
      )
      .set(auth(other.token))
      .expect(404);

    await request(app.getHttpServer())
      .delete(url(admin.communityId, `/${rehearsal.id}/entries/${second.id}`))
      .set(auth(admin.token))
      .expect(204);
    await request(app.getHttpServer())
      .delete(url(admin.communityId, `/${rehearsal.id}/entries/${second.id}`))
      .set(auth(admin.token))
      .expect(404);

    const detail = (await fetchOne(admin, rehearsal.id).expect(200))
      .body as RehearsalBody;
    expect(detail.entries?.map((e) => e.note)).toEqual(['a', 'c']);
  });

  it('deletes only empty rehearsals', async () => {
    const admin = await createAdmin(app);
    const song = await createSong(admin);
    const rehearsal = (await create(admin, { date: '2026-10-08' }).expect(201))
      .body as RehearsalBody;
    const entry = (await addEntry(admin, rehearsal.id, { songId: song.songId }))
      .body as EntryBody;
    const del = () =>
      request(app.getHttpServer())
        .delete(url(admin.communityId, `/${rehearsal.id}`))
        .set(auth(admin.token));

    const blocked = await del().expect(409);
    expect(blocked.body).toMatchObject({ code: 'REHEARSAL_NOT_EMPTY' });
    await fetchOne(admin, rehearsal.id).expect(200);

    await request(app.getHttpServer())
      .delete(url(admin.communityId, `/${rehearsal.id}/entries/${entry.id}`))
      .set(auth(admin.token))
      .expect(204);
    await del().expect(204);
    await fetchOne(admin, rehearsal.id).expect(404);
    await del().expect(404);

    await create(admin, { date: '2026-10-08' }).expect(201);
  });

  it('lists newest first with entry counts and filters by inclusive range', async () => {
    const admin = await createAdmin(app);
    const song = await createSong(admin);
    const sept = (await create(admin, { date: '2026-09-10' }).expect(201))
      .body as RehearsalBody;
    await create(admin, { date: '2026-10-08' }).expect(201);
    await addEntry(admin, sept.id, { songId: song.songId });
    const get = (query = '') =>
      request(app.getHttpServer())
        .get(`${url(admin.communityId)}${query}`)
        .set(auth(admin.token));

    const all = (await get().expect(200)).body as RehearsalBody[];
    expect(all.map((r) => [r.date, r.entryCount])).toEqual([
      ['2026-10-08', 0],
      ['2026-09-10', 1],
    ]);
    expect(all[0].entries).toBeUndefined();

    const ranged = (await get('?from=2026-09-10&to=2026-09-10').expect(200))
      .body as RehearsalBody[];
    expect(ranged.map((r) => r.date)).toEqual(['2026-09-10']);

    await get('?from=2026-10-02&to=2026-10-01').expect(400);
    await get('?from=bad').expect(400);
  });

  it('history survives archiving of songs and people', async () => {
    const admin = await createAdmin(app);
    const song = await createSong(admin, '9');
    const pianist = await createPerson(admin, 'Lorina', ['PIANIST']);
    const rehearsal = (await create(admin, { date: '2026-10-08' }).expect(201))
      .body as RehearsalBody;
    await addEntry(admin, rehearsal.id, {
      songId: song.songId,
      pianistId: pianist,
    }).expect(201);

    await request(app.getHttpServer())
      .post(`/communities/${admin.communityId}/people/${pianist}/archive`)
      .set(auth(admin.token))
      .expect(200);
    await request(app.getHttpServer())
      .post(
        `/communities/${admin.communityId}/folders/${song.folderId}/songs/${song.songId}/archive`,
      )
      .set(auth(admin.token))
      .expect(201);

    const detail = (await fetchOne(admin, rehearsal.id).expect(200))
      .body as RehearsalBody;
    expect(detail.entries?.[0].song).toMatchObject({
      title: 'Lied 9',
      archived: true,
    });
    expect(detail.entries?.[0].pianist).toMatchObject({
      name: 'Lorina',
      archived: true,
    });
  });

  it('isolates communities and enforces SINGING_LOG_MANAGE for writes', async () => {
    const admin = await createAdmin(app);
    const other = await createAdmin(app);
    const plain = await createMember(app, prisma, admin.communityId);
    const granted = await createMember(app, prisma, admin.communityId, {
      permissions: ['SINGING_LOG_MANAGE'],
    });
    const song = await createSong(admin);
    const rehearsal = (await create(admin, { date: '2026-10-08' }).expect(201))
      .body as RehearsalBody;

    await request(app.getHttpServer())
      .get(url(admin.communityId))
      .set(auth(other.token))
      .expect(403);
    await request(app.getHttpServer())
      .get(url(other.communityId, `/${rehearsal.id}`))
      .set(auth(other.token))
      .expect(404);
    await addEntry(other, rehearsal.id, { songId: song.songId }).expect(404);

    await request(app.getHttpServer())
      .get(url(admin.communityId))
      .set(auth(plain.token))
      .expect(200);
    await create(admin, { date: '2026-10-09' }, plain.token).expect(403);
    await addEntry(
      admin,
      rehearsal.id,
      { songId: song.songId },
      plain.token,
    ).expect(403);
    await request(app.getHttpServer())
      .delete(url(admin.communityId, `/${rehearsal.id}`))
      .set(auth(plain.token))
      .expect(403);

    await create(admin, { date: '2026-10-09' }, granted.token).expect(201);
  });
});
