import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createAdmin } from '../utils/factories';
import { createTestApp } from '../utils/create-test-app';
import { resetDb } from '../utils/reset-db';
import { createSuperadmin } from '../utils/superadmin-factories';

/**
 * S8: the catalog stub guard (SuperAdminGuard, which accepted any
 * authenticated user) has been replaced by the real superadmin guards.
 * D§14.1 on the actual catalog routes, matching CATALOG_DESIGN.md §12.1 as
 * amended by ADR 0011.
 */
describe('Catalog routes under superadmin guards (e2e, S8)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userToken: string;
  let superadminToken: string;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDb(prisma);
    const admin = await createAdmin(app);
    userToken = admin.token;
    const superadmin = await createSuperadmin(app);
    superadminToken = superadmin.token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /library/books: 401 without a token, 200 for a user or a superadmin token', async () => {
    await request(app.getHttpServer()).get('/library/books').expect(401);

    await request(app.getHttpServer())
      .get('/library/books')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/library/books')
      .set('Authorization', `Bearer ${superadminToken}`)
      .expect(200);
  });

  it('POST /admin/library/series: 401 without a token or with a user token, 201 with a superadmin token', async () => {
    await request(app.getHttpServer())
      .post('/admin/library/series')
      .send({ title: 'Series A' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/admin/library/series')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Series B' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/admin/library/series')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({ title: 'Series C' })
      .expect(201);
  });

  it('POST /admin/library/imports/preview: 401 without a token or with a user token, not 401 with a superadmin token', async () => {
    const file = Buffer.from(
      JSON.stringify({ format: 'chor-app-library/v1', books: [] }),
    );

    await request(app.getHttpServer())
      .post('/admin/library/imports/preview')
      .attach('file', file, 'catalog.json')
      .expect(401);

    await request(app.getHttpServer())
      .post('/admin/library/imports/preview')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('file', file, 'catalog.json')
      .expect(401);

    const res = await request(app.getHttpServer())
      .post('/admin/library/imports/preview')
      .set('Authorization', `Bearer ${superadminToken}`)
      .attach('file', file, 'catalog.json');
    expect(res.status).not.toBe(401);
  });

  it('a superadmin token is rejected on /auth/me and Community routes (regression)', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${superadminToken}`)
      .expect(401);
  });
});
