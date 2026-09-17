import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { EMAIL_SENDER } from '../../src/notifications';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createAdmin } from '../utils/factories';
import { resetDb } from '../utils/reset-db';
import { TestCommunityModule } from '../utils/test-community.controller';

describe('CommunityMemberGuard (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, TestCommunityModule],
    })
      .overrideProvider(EMAIL_SENDER)
      .useValue({
        send: jest.fn().mockResolvedValue(undefined),
      })
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

  it('rejects unauthenticated request with 401', async () => {
    const admin1 = await createAdmin(app, {
      communityName: 'Community One',
      email: 'admin1@example.com',
    });

    await request(app.getHttpServer())
      .get(`/communities/${admin1.communityId}/test-access`)
      .expect(401);
  });

  it('allows access to own community with 200 and provides db-backed communityId in context', async () => {
    const admin1 = await createAdmin(app, {
      communityName: 'Community One',
      email: 'admin1@example.com',
    });

    const res = await request(app.getHttpServer())
      .get(`/communities/${admin1.communityId}/test-access`)
      .set('Authorization', `Bearer ${admin1.token}`)
      .expect(200);

    expect(res.body).toMatchObject({
      status: 'ok',
      communityId: admin1.communityId,
      role: 'ADMINISTRATOR',
    });
    expect(res.body.permissions).toEqual(['PEOPLE_MANAGE']);
  });

  it('rejects access to another community with 403 NOT_COMMUNITY_MEMBER', async () => {
    const admin1 = await createAdmin(app, {
      communityName: 'Community One',
      email: 'admin1@example.com',
    });
    const admin2 = await createAdmin(app, {
      communityName: 'Community Two',
      email: 'admin2@example.com',
    });

    const res = await request(app.getHttpServer())
      .get(`/communities/${admin2.communityId}/test-access`)
      .set('Authorization', `Bearer ${admin1.token}`)
      .expect(403);

    expect(res.body).toMatchObject({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Not a member of this community',
      code: 'NOT_COMMUNITY_MEMBER',
    });
  });

  it('returns identical 403 response for non-existent community as for foreign community', async () => {
    const admin1 = await createAdmin(app, {
      communityName: 'Community One',
      email: 'admin1@example.com',
    });
    const admin2 = await createAdmin(app, {
      communityName: 'Community Two',
      email: 'admin2@example.com',
    });

    const foreignRes = await request(app.getHttpServer())
      .get(`/communities/${admin2.communityId}/test-access`)
      .set('Authorization', `Bearer ${admin1.token}`)
      .expect(403);

    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    const nonExistentRes = await request(app.getHttpServer())
      .get(`/communities/${nonExistentId}/test-access`)
      .set('Authorization', `Bearer ${admin1.token}`)
      .expect(403);

    expect(nonExistentRes.body).toEqual(foreignRes.body);
  });
});
