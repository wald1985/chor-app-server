import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { EMAIL_SENDER } from '../../src/notifications';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createAdmin } from '../utils/factories';
import { resetDb } from '../utils/reset-db';
import { createSuperadmin } from '../utils/superadmin-factories';
import { SuperadminTestModule } from '../utils/superadmin-test.controller';
import { TestCommunityModule } from '../utils/test-community.controller';

/**
 * D§14.1 access matrix for the current state (before S8 wires the catalog
 * routes to the superadmin guards): three subjects (no token, user token,
 * superadmin token) against representative routes. `/test-any` and
 * `/test-superadmin` stand in for the future `GET /library` and
 * `/admin/library` routes per the plan.
 */
describe('Superadmin access matrix (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userToken: string;
  let superadminToken: string;
  let communityId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, SuperadminTestModule, TestCommunityModule],
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
    const admin = await createAdmin(app);
    userToken = admin.token;
    communityId = admin.communityId;
    const superadmin = await createSuperadmin(app);
    superadminToken = superadmin.token;
  });

  afterAll(async () => {
    await app.close();
  });

  function authHeader(subject: 'none' | 'user' | 'superadmin'): string[] {
    if (subject === 'none') return [];
    const token = subject === 'user' ? userToken : superadminToken;
    return [`Bearer ${token}`];
  }

  const rows: Array<{
    name: string;
    path: () => string;
    expected: { none: number; user: number; superadmin: number };
  }> = [
    {
      name: 'GET /auth/me',
      path: () => '/auth/me',
      expected: { none: 401, user: 200, superadmin: 401 },
    },
    {
      name: 'GET /communities/:id/test-access',
      path: () => `/communities/${communityId}/test-access`,
      expected: { none: 401, user: 200, superadmin: 401 },
    },
    {
      name: 'GET /admin/me',
      path: () => '/admin/me',
      expected: { none: 401, user: 401, superadmin: 200 },
    },
    {
      name: 'GET /admin/superadmins',
      path: () => '/admin/superadmins',
      expected: { none: 401, user: 401, superadmin: 200 },
    },
    {
      name: 'GET /test-any (stand-in for GET /library)',
      path: () => '/test-any',
      expected: { none: 401, user: 200, superadmin: 200 },
    },
    {
      name: 'GET /test-superadmin (stand-in for /admin/library)',
      path: () => '/test-superadmin',
      expected: { none: 401, user: 401, superadmin: 200 },
    },
  ];

  for (const row of rows) {
    for (const subject of ['none', 'user', 'superadmin'] as const) {
      it(`${row.name} — ${subject} token → ${row.expected[subject]}`, async () => {
        const req = request(app.getHttpServer()).get(row.path());
        for (const value of authHeader(subject)) {
          req.set('Authorization', value);
        }
        await req.expect(row.expected[subject]);
      });
    }
  }

  it('POST /admin/auth/login succeeds regardless of any attached token', async () => {
    const { password } = await createSuperadmin(app, {
      email: 'login-matrix@example.org',
    });

    for (const subject of ['none', 'user', 'superadmin'] as const) {
      const req = request(app.getHttpServer())
        .post('/admin/auth/login')
        .send({ email: 'login-matrix@example.org', password });
      for (const value of authHeader(subject)) {
        req.set('Authorization', value);
      }
      await req.expect(200);
    }
  });

  it('POST /auth/change-password rejects unauthenticated and superadmin tokens before validating the body', async () => {
    await request(app.getHttpServer())
      .post('/auth/change-password')
      .send({})
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({})
      .expect(401);

    // A user token passes the guard, so an invalid body now reaches DTO
    // validation instead (400), proving the guard ran first.
    await request(app.getHttpServer())
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${userToken}`)
      .send({})
      .expect(400);
  });

  // Informative only (D11, D14.2): login compares against a dummy hash for
  // an unknown email so the response time does not obviously reveal whether
  // the email is registered. Not a strict timing guarantee.
  it('login response time is the same order of magnitude for known and unknown emails', async () => {
    const { password } = await createSuperadmin(app, {
      email: 'timing@example.org',
    });
    const attempts = 10;

    async function medianMillis(body: {
      email: string;
      password: string;
    }): Promise<number> {
      const durations: number[] = [];
      for (let i = 0; i < attempts; i++) {
        const start = Date.now();
        await request(app.getHttpServer()).post('/admin/auth/login').send(body);
        durations.push(Date.now() - start);
      }
      durations.sort((a, b) => a - b);
      return durations[Math.floor(attempts / 2)];
    }

    const knownMedian = await medianMillis({
      email: 'timing@example.org',
      password: `wrong-${password}`,
    });
    const unknownMedian = await medianMillis({
      email: 'unknown-timing@example.org',
      password: 'whatever123',
    });

    const ratio =
      Math.max(knownMedian, unknownMedian) /
      Math.max(1, Math.min(knownMedian, unknownMedian));
    expect(ratio).toBeLessThan(3);
  });
});
