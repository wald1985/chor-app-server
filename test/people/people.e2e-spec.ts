import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { EMAIL_SENDER } from '../../src/notifications';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createAdmin, createMember } from '../utils/factories';
import { resetDb } from '../utils/reset-db';

interface PersonBody {
  id: string;
  name: string;
  roles: string[];
  archived: boolean;
}

describe('People (e2e)', () => {
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

  const base = (communityId: string) => `/communities/${communityId}/people`;

  const createPerson = (
    communityId: string,
    token: string,
    name: string,
    roles: string[] = ['PIANIST'],
  ) =>
    request(app.getHttpServer())
      .post(base(communityId))
      .set('Authorization', `Bearer ${token}`)
      .send({ name, roles });

  it('requires authentication', async () => {
    const admin = await createAdmin(app);
    await request(app.getHttpServer()).get(base(admin.communityId)).expect(401);
  });

  it('creates a person with both roles and returns it', async () => {
    const admin = await createAdmin(app);
    const res = await createPerson(admin.communityId, admin.token, ' Alex ', [
      'PIANIST',
      'CONDUCTOR',
      'PIANIST',
    ]).expect(201);

    const body = res.body as PersonBody;
    expect(body.name).toBe('Alex');
    expect(body.roles).toEqual(['PIANIST', 'CONDUCTOR']);
    expect(body.archived).toBe(false);
  });

  it('rejects empty roles, unknown roles and blank names (400)', async () => {
    const admin = await createAdmin(app);
    await createPerson(admin.communityId, admin.token, 'Paul', []).expect(400);
    await createPerson(admin.communityId, admin.token, 'Paul', [
      'SINGER',
    ]).expect(400);
    await createPerson(admin.communityId, admin.token, '   ').expect(400);
    await createPerson(admin.communityId, admin.token, 'x'.repeat(101)).expect(
      400,
    );
  });

  it('rejects duplicate names case-insensitively and points to an archived holder (409)', async () => {
    const admin = await createAdmin(app);
    const paul = (
      await createPerson(admin.communityId, admin.token, 'Paul').expect(201)
    ).body as PersonBody;

    await createPerson(admin.communityId, admin.token, 'paul ').expect(409);

    await request(app.getHttpServer())
      .post(`${base(admin.communityId)}/${paul.id}/archive`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    const res = await createPerson(
      admin.communityId,
      admin.token,
      'PAUL',
    ).expect(409);
    expect(res.body).toMatchObject({
      code: 'PERSON_NAME_TAKEN',
      existingPersonId: paul.id,
      existingArchived: true,
    });
  });

  it('allows the same name in another community', async () => {
    const admin1 = await createAdmin(app);
    const admin2 = await createAdmin(app);
    await createPerson(admin1.communityId, admin1.token, 'Paul').expect(201);
    await createPerson(admin2.communityId, admin2.token, 'Paul').expect(201);
  });

  it('lists sorted by name, filters by role (dual-role included) and archived state', async () => {
    const admin = await createAdmin(app);
    await createPerson(admin.communityId, admin.token, 'Daniel', ['CONDUCTOR']);
    await createPerson(admin.communityId, admin.token, 'alex', [
      'PIANIST',
      'CONDUCTOR',
    ]);
    const gone = (
      await createPerson(admin.communityId, admin.token, 'Springer')
    ).body as PersonBody;
    await request(app.getHttpServer())
      .post(`${base(admin.communityId)}/${gone.id}/archive`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    const auth = { Authorization: `Bearer ${admin.token}` };
    const all = await request(app.getHttpServer())
      .get(base(admin.communityId))
      .set(auth)
      .expect(200);
    expect((all.body as PersonBody[]).map((p) => p.name)).toEqual([
      'alex',
      'Daniel',
    ]);

    const pianists = await request(app.getHttpServer())
      .get(`${base(admin.communityId)}?role=PIANIST`)
      .set(auth)
      .expect(200);
    expect((pianists.body as PersonBody[]).map((p) => p.name)).toEqual([
      'alex',
    ]);

    const withArchived = await request(app.getHttpServer())
      .get(`${base(admin.communityId)}?includeArchived=true`)
      .set(auth)
      .expect(200);
    expect(withArchived.body as PersonBody[]).toHaveLength(3);

    await request(app.getHttpServer())
      .get(`${base(admin.communityId)}?role=SINGER`)
      .set(auth)
      .expect(400);
  });

  it('fetches an archived person by id; another community gets 404', async () => {
    const admin1 = await createAdmin(app);
    const admin2 = await createAdmin(app);
    const person = (
      await createPerson(admin1.communityId, admin1.token, 'Paul')
    ).body as PersonBody;
    await request(app.getHttpServer())
      .post(`${base(admin1.communityId)}/${person.id}/archive`)
      .set('Authorization', `Bearer ${admin1.token}`);

    const res = await request(app.getHttpServer())
      .get(`${base(admin1.communityId)}/${person.id}`)
      .set('Authorization', `Bearer ${admin1.token}`)
      .expect(200);
    expect((res.body as PersonBody).archived).toBe(true);

    await request(app.getHttpServer())
      .get(`${base(admin2.communityId)}/${person.id}`)
      .set('Authorization', `Bearer ${admin2.token}`)
      .expect(404);
  });

  it('member without PEOPLE_MANAGE can read but not write (403); with it can write', async () => {
    const admin = await createAdmin(app);
    const plain = await createMember(app, prisma, admin.communityId);
    const manager = await createMember(app, prisma, admin.communityId, {
      permissions: ['PEOPLE_MANAGE'],
    });
    const person = (await createPerson(admin.communityId, admin.token, 'Paul'))
      .body as PersonBody;
    const url = `${base(admin.communityId)}/${person.id}`;
    const as = (m: { token: string }) => ({
      Authorization: `Bearer ${m.token}`,
    });

    await request(app.getHttpServer())
      .get(base(admin.communityId))
      .set(as(plain))
      .expect(200);
    await createPerson(admin.communityId, plain.token, 'Lorina').expect(403);
    await request(app.getHttpServer())
      .patch(url)
      .set(as(plain))
      .send({ name: 'X' })
      .expect(403);
    await request(app.getHttpServer())
      .post(`${url}/archive`)
      .set(as(plain))
      .expect(403);
    await request(app.getHttpServer())
      .post(`${url}/restore`)
      .set(as(plain))
      .expect(403);

    await createPerson(admin.communityId, manager.token, 'Lorina').expect(201);
  });

  it('forbids a user from another community (403)', async () => {
    const admin1 = await createAdmin(app);
    const admin2 = await createAdmin(app);
    await request(app.getHttpServer())
      .get(base(admin1.communityId))
      .set('Authorization', `Bearer ${admin2.token}`)
      .expect(403);
  });

  it('edits name and roles, rejects empty roles, taken names and archived persons', async () => {
    const admin = await createAdmin(app);
    const lorina = (
      await createPerson(admin.communityId, admin.token, 'Lorina')
    ).body as PersonBody;
    await createPerson(admin.communityId, admin.token, 'Alex');
    const url = `${base(admin.communityId)}/${lorina.id}`;
    const auth = { Authorization: `Bearer ${admin.token}` };

    const edited = await request(app.getHttpServer())
      .patch(url)
      .set(auth)
      .send({ roles: ['PIANIST', 'CONDUCTOR'] })
      .expect(200);
    expect((edited.body as PersonBody).roles).toEqual(['PIANIST', 'CONDUCTOR']);

    await request(app.getHttpServer())
      .patch(url)
      .set(auth)
      .send({ roles: [] })
      .expect(400);
    const unchanged = await request(app.getHttpServer()).get(url).set(auth);
    expect((unchanged.body as PersonBody).roles).toEqual([
      'PIANIST',
      'CONDUCTOR',
    ]);

    await request(app.getHttpServer())
      .patch(url)
      .set(auth)
      .send({ name: 'ALEX' })
      .expect(409);

    await request(app.getHttpServer()).post(`${url}/archive`).set(auth);
    await request(app.getHttpServer())
      .patch(url)
      .set(auth)
      .send({ name: 'Lorina K.' })
      .expect(409);
  });

  it('archive and restore are idempotent and keep name and roles', async () => {
    const admin = await createAdmin(app);
    const person = (
      await createPerson(admin.communityId, admin.token, 'Springer', [
        'CONDUCTOR',
      ])
    ).body as PersonBody;
    const url = `${base(admin.communityId)}/${person.id}`;
    const auth = { Authorization: `Bearer ${admin.token}` };

    const first = await request(app.getHttpServer())
      .post(`${url}/archive`)
      .set(auth)
      .expect(200);
    const second = await request(app.getHttpServer())
      .post(`${url}/archive`)
      .set(auth)
      .expect(200);
    expect(second.body).toEqual(first.body);
    expect((first.body as PersonBody).archived).toBe(true);

    const restored = await request(app.getHttpServer())
      .post(`${url}/restore`)
      .set(auth)
      .expect(200);
    expect(restored.body).toMatchObject({
      name: 'Springer',
      roles: ['CONDUCTOR'],
      archived: false,
    });
    await request(app.getHttpServer())
      .post(`${url}/restore`)
      .set(auth)
      .expect(200);
  });

  it('has no hard delete endpoint', async () => {
    const admin = await createAdmin(app);
    const person = (await createPerson(admin.communityId, admin.token, 'Paul'))
      .body as PersonBody;
    await request(app.getHttpServer())
      .delete(`${base(admin.communityId)}/${person.id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(404);
  });
});
