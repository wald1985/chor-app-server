import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp } from '../utils/create-test-app';
import { resetDb } from '../utils/reset-db';
import { createSuperadmin } from '../utils/superadmin-factories';

describe('Superadmin management API (e2e)', () => {
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

  it('lists superadmins with isCurrent set only on the actor row', async () => {
    const { token, superadmin: self } = await createSuperadmin(app);
    const { superadmin: other } = await createSuperadmin(app);

    const res = await request(app.getHttpServer())
      .get('/admin/superadmins')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const byId = new Map(
      (res.body as Array<{ id: string; isCurrent: boolean }>).map((s) => [
        s.id,
        s.isCurrent,
      ]),
    );
    expect(byId.get(self.id)).toBe(true);
    expect(byId.get(other.id)).toBe(false);
  });

  it('gets a single superadmin by id', async () => {
    const { token } = await createSuperadmin(app);
    const { superadmin: other } = await createSuperadmin(app);

    const res = await request(app.getHttpServer())
      .get(`/admin/superadmins/${other.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.id).toBe(other.id);
  });

  it('returns 404 for an unknown id and 400 for a non-UUID id', async () => {
    const { token } = await createSuperadmin(app);

    await request(app.getHttpServer())
      .get('/admin/superadmins/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    await request(app.getHttpServer())
      .get('/admin/superadmins/not-a-uuid')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('creates a new superadmin, who can then log in', async () => {
    const { token } = await createSuperadmin(app);

    const createRes = await request(app.getHttpServer())
      .post('/admin/superadmins')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'created@example.org',
        name: 'Created',
        password: 'createdPass1',
      })
      .expect(201);
    expect(createRes.body.email).toBe('created@example.org');
    expect(createRes.body.passwordHash).toBeUndefined();

    await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({ email: 'created@example.org', password: 'createdPass1' })
      .expect(200);
  });

  it('rejects creating a superadmin with a taken email', async () => {
    const { token, superadmin } = await createSuperadmin(app, {
      email: 'dup@example.org',
    });

    const res = await request(app.getHttpServer())
      .post('/admin/superadmins')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'Dup@Example.org', name: 'Dup', password: 'password1' })
      .expect(409);
    expect(res.body.code).toBe('SUPERADMIN_EMAIL_TAKEN');
    expect(res.body.existingId).toBe(superadmin.id);
  });

  it('updates another superadmin and rejects an empty PATCH body', async () => {
    const { token } = await createSuperadmin(app);
    const { superadmin: other } = await createSuperadmin(app);

    const res = await request(app.getHttpServer())
      .patch(`/admin/superadmins/${other.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Renamed' })
      .expect(200);
    expect(res.body.name).toBe('Renamed');

    await request(app.getHttpServer())
      .patch(`/admin/superadmins/${other.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400);
  });

  it('setting another superadmin password invalidates their old token', async () => {
    const { token } = await createSuperadmin(app);
    const { token: otherToken, superadmin: other } =
      await createSuperadmin(app);

    await request(app.getHttpServer())
      .put(`/admin/superadmins/${other.id}/password`)
      .set('Authorization', `Bearer ${token}`)
      .send({ newPassword: 'freshPassword1' })
      .expect(204);

    await request(app.getHttpServer())
      .get('/admin/me')
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(401);

    await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({ email: other.email, password: 'freshPassword1' })
      .expect(200);
  });

  it('setting your own password via the admin endpoint is rejected', async () => {
    const { token, superadmin } = await createSuperadmin(app);

    const res = await request(app.getHttpServer())
      .put(`/admin/superadmins/${superadmin.id}/password`)
      .set('Authorization', `Bearer ${token}`)
      .send({ newPassword: 'whatever12' })
      .expect(409);
    expect(res.body.code).toBe('SUPERADMIN_USE_CHANGE_PASSWORD');
  });

  it('deleting yourself is rejected even as the sole superadmin', async () => {
    const { token, superadmin } = await createSuperadmin(app);

    const res = await request(app.getHttpServer())
      .delete(`/admin/superadmins/${superadmin.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);
    expect(res.body.code).toBe('SUPERADMIN_CANNOT_DELETE_SELF');
  });

  it('deletes another superadmin, whose token then stops working', async () => {
    const { token } = await createSuperadmin(app);
    const { token: otherToken, superadmin: other } =
      await createSuperadmin(app);

    await request(app.getHttpServer())
      .delete(`/admin/superadmins/${other.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    await request(app.getHttpServer())
      .get('/admin/me')
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(401);
  });

  it('two superadmins deleting each other concurrently never leaves zero superadmins (x20)', async () => {
    for (let i = 0; i < 20; i++) {
      await resetDb(prisma);
      const a = await createSuperadmin(app);
      const b = await createSuperadmin(app);

      const results = await Promise.allSettled([
        request(app.getHttpServer())
          .delete(`/admin/superadmins/${b.superadmin.id}`)
          .set('Authorization', `Bearer ${a.token}`),
        request(app.getHttpServer())
          .delete(`/admin/superadmins/${a.superadmin.id}`)
          .set('Authorization', `Bearer ${b.token}`),
      ]);

      const statuses = results.map((r) =>
        r.status === 'fulfilled' ? r.value.status : -1,
      );
      expect(statuses.filter((s) => s === 204)).toHaveLength(1);
      expect(statuses.some((s) => s === 409 || s === 401)).toBe(true);

      const count = await prisma.superadmin.count();
      expect(count).toBe(1);
    }
  });
});
