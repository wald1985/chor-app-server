import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { EMAIL_SENDER } from '../../src/notifications';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { SUPERADMIN_TOKEN_AUDIENCE } from '../../src/superadmin/domain/superadmin-token-audience';
import { createAdmin } from '../utils/factories';
import { resetDb } from '../utils/reset-db';
import { createSuperadmin } from '../utils/superadmin-factories';
import { SuperadminTestModule } from '../utils/superadmin-test.controller';

describe('Superadmin token separation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, SuperadminTestModule],
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
    jwtService = app.get(JwtService);
  });

  beforeEach(async () => {
    await resetDb(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('a superadmin token is rejected on user-only routes', async () => {
    const { token } = await createSuperadmin(app);

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    await request(app.getHttpServer())
      .get('/test-jwt-only')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  it('a superadmin token is accepted on superadmin and any-principal routes', async () => {
    const { token, superadmin } = await createSuperadmin(app);

    const res = await request(app.getHttpServer())
      .get('/test-superadmin')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.principal).toEqual({
      kind: 'superadmin',
      id: superadmin.id,
      email: superadmin.email,
      name: superadmin.name,
    });

    await request(app.getHttpServer())
      .get('/test-any')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('a user token is rejected on superadmin-only routes but accepted on any-principal routes', async () => {
    const admin = await createAdmin(app);

    await request(app.getHttpServer())
      .get('/test-superadmin')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(401);

    await request(app.getHttpServer())
      .get('/test-any')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
  });

  it('a same-secret token without aud but a superadmin sub is rejected on superadmin routes', async () => {
    const { superadmin } = await createSuperadmin(app);
    const forgedUserToken = jwtService.sign({
      sub: superadmin.id,
      email: superadmin.email,
      tokenVersion: 0,
    });

    await request(app.getHttpServer())
      .get('/test-superadmin')
      .set('Authorization', `Bearer ${forgedUserToken}`)
      .expect(401);
  });

  it('an expired superadmin token is rejected', async () => {
    const { superadmin } = await createSuperadmin(app);
    const expiredToken = jwtService.sign(
      { sub: superadmin.id, email: superadmin.email, tokenVersion: 0 },
      { audience: SUPERADMIN_TOKEN_AUDIENCE, expiresIn: '-1s' },
    );

    await request(app.getHttpServer())
      .get('/test-superadmin')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });

  it('unauthenticated requests are rejected everywhere', async () => {
    await request(app.getHttpServer()).get('/test-superadmin').expect(401);
    await request(app.getHttpServer()).get('/test-any').expect(401);
  });
});
