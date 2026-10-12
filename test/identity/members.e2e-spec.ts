import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { EMAIL_SENDER } from '../../src/notifications';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createAdmin, createMember } from '../utils/factories';
import { resetDb } from '../utils/reset-db';

interface MemberBody {
  membershipId: string;
  email: string;
  role: string;
  permissions: string[];
}

describe('Members (e2e)', () => {
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

  it('requires authentication', async () => {
    const admin = await createAdmin(app);
    await request(app.getHttpServer())
      .get(`/communities/${admin.communityId}/members`)
      .expect(401);
  });

  it('lists members with effective permissions (administrator gets all)', async () => {
    const admin = await createAdmin(app);
    const member = await createMember(app, prisma, admin.communityId, {
      permissions: ['PEOPLE_MANAGE'],
    });

    const res = await request(app.getHttpServer())
      .get(`/communities/${admin.communityId}/members`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    const body = res.body as MemberBody[];
    expect(body).toHaveLength(2);
    const adminRow = body.find((m) => m.role === 'ADMINISTRATOR');
    const memberRow = body.find((m) => m.membershipId === member.membershipId);
    expect(adminRow?.permissions).toEqual(
      expect.arrayContaining(['PEOPLE_MANAGE', 'REPERTOIRE_MANAGE']),
    );
    expect(memberRow?.permissions).toEqual(['PEOPLE_MANAGE']);
  });

  it('forbids a MEMBER from listing and setting permissions (403)', async () => {
    const admin = await createAdmin(app);
    const member = await createMember(app, prisma, admin.communityId, {
      permissions: ['PEOPLE_MANAGE'],
    });

    await request(app.getHttpServer())
      .get(`/communities/${admin.communityId}/members`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(403);

    await request(app.getHttpServer())
      .put(
        `/communities/${admin.communityId}/members/${member.membershipId}/permissions`,
      )
      .set('Authorization', `Bearer ${member.token}`)
      .send({ permissions: [] })
      .expect(403);
  });

  it('forbids a non-member of the community (403)', async () => {
    const admin1 = await createAdmin(app);
    const admin2 = await createAdmin(app);

    await request(app.getHttpServer())
      .get(`/communities/${admin1.communityId}/members`)
      .set('Authorization', `Bearer ${admin2.token}`)
      .expect(403);
  });

  it('sets and revokes permissions; effect is immediate and reflected in /auth/me', async () => {
    const admin = await createAdmin(app);
    const member = await createMember(app, prisma, admin.communityId);
    const url = `/communities/${admin.communityId}/members/${member.membershipId}/permissions`;

    const setRes = await request(app.getHttpServer())
      .put(url)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ permissions: ['REPERTOIRE_MANAGE', 'REPERTOIRE_MANAGE'] })
      .expect(200);
    expect(setRes.body).toEqual({
      membershipId: member.membershipId,
      permissions: ['REPERTOIRE_MANAGE'],
    });

    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${member.token}`)
      .expect(200);
    const memberships = (
      me.body as {
        memberships: { communityId: string; permissions: string[] }[];
      }
    ).memberships;
    expect(
      memberships.find((m) => m.communityId === admin.communityId)?.permissions,
    ).toEqual(['REPERTOIRE_MANAGE']);

    await request(app.getHttpServer())
      .put(url)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ permissions: [] })
      .expect(200);

    const list = await request(app.getHttpServer())
      .get(`/communities/${admin.communityId}/members`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    const row = (list.body as MemberBody[]).find(
      (m) => m.membershipId === member.membershipId,
    );
    expect(row?.permissions).toEqual([]);
  });

  it('rejects unknown permission values (400) and non-array payload (400)', async () => {
    const admin = await createAdmin(app);
    const member = await createMember(app, prisma, admin.communityId);
    const url = `/communities/${admin.communityId}/members/${member.membershipId}/permissions`;

    await request(app.getHttpServer())
      .put(url)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ permissions: ['NOPE'] })
      .expect(400);

    await request(app.getHttpServer())
      .put(url)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({})
      .expect(400);
  });

  it('returns 409 when the target is an administrator', async () => {
    const admin = await createAdmin(app);
    const membership = await prisma.communityMembership.findFirstOrThrow({
      where: { userId: admin.user.id, communityId: admin.communityId },
    });

    await request(app.getHttpServer())
      .put(
        `/communities/${admin.communityId}/members/${membership.id}/permissions`,
      )
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ permissions: ['PEOPLE_MANAGE'] })
      .expect(409);
  });

  it('returns 404 for a membership of another community or unknown id', async () => {
    const admin1 = await createAdmin(app);
    const admin2 = await createAdmin(app);
    const foreign = await createMember(app, prisma, admin2.communityId);

    await request(app.getHttpServer())
      .put(
        `/communities/${admin1.communityId}/members/${foreign.membershipId}/permissions`,
      )
      .set('Authorization', `Bearer ${admin1.token}`)
      .send({ permissions: [] })
      .expect(404);

    await request(app.getHttpServer())
      .put(
        `/communities/${admin1.communityId}/members/00000000-0000-4000-8000-000000000000/permissions`,
      )
      .set('Authorization', `Bearer ${admin1.token}`)
      .send({ permissions: [] })
      .expect(404);
  });
});
