import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp } from '../utils/create-test-app';
import { resetDb } from '../utils/reset-db';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let fakeEmailSender: { send: jest.Mock };

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    prisma = app.get(PrismaService);
    fakeEmailSender = testApp.fakeEmailSender;
  });

  beforeEach(async () => {
    await resetDb(prisma);
    fakeEmailSender.send.mockClear();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('registers a new user and community administrator', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'admin@example.com',
          password: 'Password123!',
          name: 'Admin User',
          communityName: 'Chor Zürich',
        })
        .expect(201);

      expect(res.body).toMatchObject({
        communityName: 'Chor Zürich',
        role: 'ADMINISTRATOR',
      });
      expect(typeof res.body.userId).toBe('string');
      expect(typeof res.body.communityId).toBe('string');
    });

    it('rejects duplicate email registration with 409', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'admin@example.com',
          password: 'Password123!',
          name: 'Admin User',
          communityName: 'Chor Zürich',
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'admin@example.com',
          password: 'AnotherPassword123!',
          name: 'Another Name',
          communityName: 'Another Community',
        })
        .expect(409);

      expect(res.body.message).toMatch(/already registered/i);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'user@example.com',
          password: 'Password123!',
          name: 'Test User',
          communityName: 'Test Choir',
        })
        .expect(201);
    });

    it('returns access token, user info and memberships on valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'user@example.com',
          password: 'Password123!',
        })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user).toMatchObject({
        email: 'user@example.com',
        name: 'Test User',
      });
      expect(res.body.memberships).toHaveLength(1);
      expect(res.body.memberships[0]).toMatchObject({
        communityName: 'Test Choir',
        role: 'ADMINISTRATOR',
      });
    });

    it('rejects invalid password with 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'user@example.com',
          password: 'WrongPassword!',
        })
        .expect(401);

      expect(res.body.statusCode).toBe(401);
    });
  });

  describe('GET /auth/me', () => {
    it('returns user and memberships when authenticated', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'user@example.com',
          password: 'Password123!',
          name: 'Test User',
          communityName: 'Test Choir',
        })
        .expect(201);

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'user@example.com',
          password: 'Password123!',
        })
        .expect(200);

      const token = loginRes.body.accessToken;

      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.user.email).toBe('user@example.com');
      expect(res.body.memberships).toHaveLength(1);
    });

    it('rejects unauthenticated request with 401', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('does not send emails during registration or login', () => {
      expect(fakeEmailSender.send).not.toHaveBeenCalled();
    });
  });
});
