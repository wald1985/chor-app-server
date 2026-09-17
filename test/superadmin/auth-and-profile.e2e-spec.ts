import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp } from '../utils/create-test-app';
import { resetDb } from '../utils/reset-db';
import { createSuperadmin } from '../utils/superadmin-factories';

describe('Superadmin login and profile (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDb(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('logs in and returns a token plus the profile without secrets', async () => {
    const { superadmin, password } = await createSuperadmin(app, {
      email: 'alex@example.org',
    });

    const res = await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({ email: 'alex@example.org', password })
      .expect(200);

    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.superadmin).toMatchObject({
      id: superadmin.id,
      email: 'alex@example.org',
      isCurrent: true,
    });
    expect(res.body.superadmin.passwordHash).toBeUndefined();
    expect(res.body.superadmin.tokenVersion).toBeUndefined();
  });

  it('an unknown email and a wrong password return the same 401', async () => {
    await createSuperadmin(app, { email: 'known@example.org' });

    const unknownRes = await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({ email: 'unknown@example.org', password: 'whatever1' })
      .expect(401);
    expect(unknownRes.body.code).toBe('INVALID_CREDENTIALS');

    const wrongPasswordRes = await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({ email: 'known@example.org', password: 'wrongpass1' })
      .expect(401);
    expect(wrongPasswordRes.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('GET and PATCH /admin/me require a superadmin token', async () => {
    const { token, superadmin } = await createSuperadmin(app);

    const getRes = await request(app.getHttpServer())
      .get('/admin/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(getRes.body).toMatchObject({ id: superadmin.id, isCurrent: true });

    const patchRes = await request(app.getHttpServer())
      .patch('/admin/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name' })
      .expect(200);
    expect(patchRes.body.name).toBe('New Name');

    await request(app.getHttpServer()).get('/admin/me').expect(401);
  });

  it('PATCH /admin/me with an empty body returns 400', async () => {
    const { token } = await createSuperadmin(app);

    await request(app.getHttpServer())
      .patch('/admin/me')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400);
  });

  it('changing the password issues a working new token and invalidates the old one', async () => {
    const { token, password } = await createSuperadmin(app, {
      email: 'pw@example.org',
    });

    const changeRes = await request(app.getHttpServer())
      .post('/admin/me/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: password, newPassword: 'brandNewPass1' })
      .expect(200);
    const newToken = changeRes.body.accessToken as string;
    expect(newToken).toEqual(expect.any(String));

    await request(app.getHttpServer())
      .get('/admin/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    await request(app.getHttpServer())
      .get('/admin/me')
      .set('Authorization', `Bearer ${newToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({ email: 'pw@example.org', password: 'brandNewPass1' })
      .expect(200);
  });

  it('extra fields in request bodies are stripped by whitelist validation', async () => {
    const { token } = await createSuperadmin(app);

    const res = await request(app.getHttpServer())
      .patch('/admin/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Whitelisted', tokenVersion: 999, passwordHash: 'x' })
      .expect(200);

    expect(res.body.name).toBe('Whitelisted');
  });
});
