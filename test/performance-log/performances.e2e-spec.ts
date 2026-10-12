import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { EMAIL_SENDER } from '../../src/notifications';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createAdmin, createMember, RegisteredAdmin } from '../utils/factories';
import { resetDb } from '../utils/reset-db';

interface PerformanceBody {
  id: string;
  date: string;
  songId: string;
  song: { title: string; archived: boolean } | null;
  pianist: { id: string; name: string; archived: boolean } | null;
  conductor: { id: string; name: string; archived: boolean } | null;
  note: string | null;
}

describe('Performance log (e2e)', () => {
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
    `/communities/${communityId}/performances${suffix}`;

  /** A song of the Community: folder "Mappe" with one song. */
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
    return {
      folderId,
      songId: (songRes.body as { id: string }).id,
    };
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

  const record = (
    admin: RegisteredAdmin,
    body: Record<string, unknown>,
    token = admin.token,
  ) =>
    request(app.getHttpServer())
      .post(url(admin.communityId))
      .set(auth(token))
      .send(body);

  it('requires authentication', async () => {
    const admin = await createAdmin(app);
    await request(app.getHttpServer()).get(url(admin.communityId)).expect(401);
  });

  it('records a performance with all fields and returns it resolved', async () => {
    const admin = await createAdmin(app);
    const { songId } = await createSong(admin, '42');
    const pianistId = await createPerson(admin, 'Lorina', ['PIANIST']);
    const conductorId = await createPerson(admin, 'Daniel', ['CONDUCTOR']);

    const res = await record(admin, {
      date: '2026-10-04',
      songId,
      pianistId,
      conductorId,
      note: '  Gottesdienst ',
    }).expect(201);

    const body = res.body as PerformanceBody;
    expect(body.date).toBe('2026-10-04');
    expect(body.song?.title).toBe('Lied 42');
    expect(body.pianist).toMatchObject({ name: 'Lorina', archived: false });
    expect(body.conductor).toMatchObject({ name: 'Daniel' });
    expect(body.note).toBe('Gottesdienst');
  });

  it('records with only a date and a song', async () => {
    const admin = await createAdmin(app);
    const { songId } = await createSong(admin);
    const res = await record(admin, { date: '2026-10-04', songId }).expect(201);
    const body = res.body as PerformanceBody;
    expect(body.pianist).toBeNull();
    expect(body.conductor).toBeNull();
    expect(body.note).toBeNull();
  });

  it('rejects invalid input (400) and stores nothing', async () => {
    const admin = await createAdmin(app);
    const { songId } = await createSong(admin);

    await record(admin, { date: '2026-02-30', songId }).expect(400);
    await record(admin, { songId }).expect(400);
    await record(admin, { date: '2026-10-04' }).expect(400);
    await record(admin, { date: '2026-10-04', songId: 'not-a-uuid' }).expect(
      400,
    );
    await record(admin, {
      date: '2026-10-04',
      songId,
      note: 'x'.repeat(501),
    }).expect(400);

    const list = await request(app.getHttpServer())
      .get(url(admin.communityId))
      .set(auth(admin.token))
      .expect(200);
    expect(list.body as PerformanceBody[]).toHaveLength(0);
  });

  it('rejects songs that are unknown, from another community, or archived (SONG_NOT_FOUND)', async () => {
    const admin = await createAdmin(app);
    const other = await createAdmin(app);
    const foreign = await createSong(other);
    const own = await createSong(admin, '2');

    const unknown = await record(admin, {
      date: '2026-10-04',
      songId: '00000000-0000-4000-8000-000000000000',
    }).expect(400);
    expect(unknown.body).toMatchObject({ code: 'SONG_NOT_FOUND' });

    await record(admin, { date: '2026-10-04', songId: foreign.songId }).expect(
      400,
    );

    await request(app.getHttpServer())
      .post(
        `/communities/${admin.communityId}/folders/${own.folderId}/songs/${own.songId}/archive`,
      )
      .set(auth(admin.token))
      .expect(201);
    await record(admin, { date: '2026-10-04', songId: own.songId }).expect(400);
  });

  it('rejects people with the wrong role, archived, or from another community', async () => {
    const admin = await createAdmin(app);
    const other = await createAdmin(app);
    const { songId } = await createSong(admin);
    const pianist = await createPerson(admin, 'Lorina', ['PIANIST']);
    const gone = await createPerson(admin, 'Springer', ['PIANIST']);
    const foreign = await createPerson(other, 'Fremd', ['PIANIST']);
    await request(app.getHttpServer())
      .post(`/communities/${admin.communityId}/people/${gone}/archive`)
      .set(auth(admin.token))
      .expect(200);

    const mismatch = await record(admin, {
      date: '2026-10-04',
      songId,
      conductorId: pianist,
    }).expect(400);
    expect(mismatch.body).toMatchObject({ code: 'PERSON_ROLE_MISMATCH' });

    const archived = await record(admin, {
      date: '2026-10-04',
      songId,
      pianistId: gone,
    }).expect(400);
    expect(archived.body).toMatchObject({ code: 'PERSON_ARCHIVED' });

    const missing = await record(admin, {
      date: '2026-10-04',
      songId,
      pianistId: foreign,
    }).expect(400);
    expect(missing.body).toMatchObject({ code: 'PERSON_NOT_FOUND' });
  });

  it('accepts one person holding both roles as pianist and conductor', async () => {
    const admin = await createAdmin(app);
    const { songId } = await createSong(admin);
    const both = await createPerson(admin, 'Alex', ['PIANIST', 'CONDUCTOR']);

    await record(admin, {
      date: '2026-10-04',
      songId,
      pianistId: both,
      conductorId: both,
    }).expect(201);
  });

  it('lists newest first, filters by inclusive range, limits and validates', async () => {
    const admin = await createAdmin(app);
    const { songId } = await createSong(admin);
    for (const date of [
      '2026-09-30',
      '2026-10-04',
      '2026-09-01',
      '2026-10-04',
    ]) {
      await record(admin, { date, songId, note: date }).expect(201);
    }
    const get = (query: string) =>
      request(app.getHttpServer())
        .get(`${url(admin.communityId)}${query}`)
        .set(auth(admin.token));

    const all = await get('').expect(200);
    expect((all.body as PerformanceBody[]).map((p) => p.date)).toEqual([
      '2026-10-04',
      '2026-10-04',
      '2026-09-30',
      '2026-09-01',
    ]);

    const ranged = await get('?from=2026-09-01&to=2026-09-30').expect(200);
    expect((ranged.body as PerformanceBody[]).map((p) => p.date)).toEqual([
      '2026-09-30',
      '2026-09-01',
    ]);

    const limited = await get('?limit=1').expect(200);
    expect(limited.body as PerformanceBody[]).toHaveLength(1);

    await get('?from=2026-10-02&to=2026-10-01').expect(400);
    await get('?from=bad').expect(400);
    await get('?limit=0').expect(400);
    await get('?limit=201').expect(400);
  });

  it('history survives archiving and shows later corrections', async () => {
    const admin = await createAdmin(app);
    const song = await createSong(admin, '7');
    const pianistId = await createPerson(admin, 'Lorina', ['PIANIST']);
    const created = await record(admin, {
      date: '2026-10-04',
      songId: song.songId,
      pianistId,
    }).expect(201);
    const id = (created.body as PerformanceBody).id;

    await request(app.getHttpServer())
      .patch(`/communities/${admin.communityId}/people/${pianistId}`)
      .set(auth(admin.token))
      .send({ name: 'Lorina K.' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(
        `/communities/${admin.communityId}/folders/${song.folderId}/songs/${song.songId}`,
      )
      .set(auth(admin.token))
      .send({ title: 'Neuer Titel' })
      .expect(200);

    let res = await request(app.getHttpServer())
      .get(url(admin.communityId, `/${id}`))
      .set(auth(admin.token))
      .expect(200);
    expect((res.body as PerformanceBody).pianist?.name).toBe('Lorina K.');
    expect((res.body as PerformanceBody).song?.title).toBe('Neuer Titel');

    await request(app.getHttpServer())
      .post(`/communities/${admin.communityId}/people/${pianistId}/archive`)
      .set(auth(admin.token))
      .expect(200);
    await request(app.getHttpServer())
      .post(
        `/communities/${admin.communityId}/folders/${song.folderId}/songs/${song.songId}/archive`,
      )
      .set(auth(admin.token))
      .expect(201);

    res = await request(app.getHttpServer())
      .get(url(admin.communityId))
      .set(auth(admin.token))
      .expect(200);
    const [entry] = res.body as PerformanceBody[];
    expect(entry.pianist).toMatchObject({ name: 'Lorina K.', archived: true });
    expect(entry.song).toMatchObject({ title: 'Neuer Titel', archived: true });
  });

  it('isolates communities: foreign get/delete are 404, non-members are 403', async () => {
    const admin1 = await createAdmin(app);
    const admin2 = await createAdmin(app);
    const { songId } = await createSong(admin1);
    const created = await record(admin1, {
      date: '2026-10-04',
      songId,
    }).expect(201);
    const id = (created.body as PerformanceBody).id;

    await request(app.getHttpServer())
      .get(url(admin2.communityId, `/${id}`))
      .set(auth(admin2.token))
      .expect(404);
    await request(app.getHttpServer())
      .delete(url(admin2.communityId, `/${id}`))
      .set(auth(admin2.token))
      .expect(404);
    await request(app.getHttpServer())
      .get(url(admin1.communityId))
      .set(auth(admin2.token))
      .expect(403);

    await request(app.getHttpServer())
      .get(url(admin1.communityId, `/${id}`))
      .set(auth(admin1.token))
      .expect(200);
  });

  it('enforces SINGING_LOG_MANAGE for writes; members read; administrators and granted members write', async () => {
    const admin = await createAdmin(app);
    const plain = await createMember(app, prisma, admin.communityId);
    const granted = await createMember(app, prisma, admin.communityId, {
      permissions: ['SINGING_LOG_MANAGE'],
    });
    const { songId } = await createSong(admin);
    const created = await record(admin, {
      date: '2026-10-04',
      songId,
    }).expect(201);
    const id = (created.body as PerformanceBody).id;

    await request(app.getHttpServer())
      .get(url(admin.communityId))
      .set(auth(plain.token))
      .expect(200);
    await record(admin, { date: '2026-10-05', songId }, plain.token).expect(
      403,
    );
    await request(app.getHttpServer())
      .delete(url(admin.communityId, `/${id}`))
      .set(auth(plain.token))
      .expect(403);

    await record(admin, { date: '2026-10-05', songId }, granted.token).expect(
      201,
    );
  });

  it('lets the administrator grant the permission through the members endpoint', async () => {
    const admin = await createAdmin(app);
    const member = await createMember(app, prisma, admin.communityId);
    const { songId } = await createSong(admin);

    await record(admin, { date: '2026-10-05', songId }, member.token).expect(
      403,
    );
    await request(app.getHttpServer())
      .put(
        `/communities/${admin.communityId}/members/${member.membershipId}/permissions`,
      )
      .set(auth(admin.token))
      .send({ permissions: ['SINGING_LOG_MANAGE'] })
      .expect(200);
    await record(admin, { date: '2026-10-05', songId }, member.token).expect(
      201,
    );
  });

  it('deletes a performance (204) and then it is gone', async () => {
    const admin = await createAdmin(app);
    const { songId } = await createSong(admin);
    const created = await record(admin, {
      date: '2026-10-04',
      songId,
    }).expect(201);
    const id = (created.body as PerformanceBody).id;

    await request(app.getHttpServer())
      .delete(url(admin.communityId, `/${id}`))
      .set(auth(admin.token))
      .expect(204);
    await request(app.getHttpServer())
      .get(url(admin.communityId, `/${id}`))
      .set(auth(admin.token))
      .expect(404);
    await request(app.getHttpServer())
      .delete(url(admin.communityId, `/${id}`))
      .set(auth(admin.token))
      .expect(404);
  });
});
