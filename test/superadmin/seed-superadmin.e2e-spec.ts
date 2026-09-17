import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { SeedSuperadminUseCase } from '../../src/superadmin/application/use-cases/seed/seed-superadmin.use-case';
import { runSeedSuperadmin } from '../../src/superadmin/interface/cli/seed-superadmin';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp } from '../utils/create-test-app';
import { resetDb } from '../utils/reset-db';

describe('seed-superadmin CLI core (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let useCase: SeedSuperadminUseCase;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    prisma = app.get(PrismaService);
    useCase = app.get(SeedSuperadminUseCase);
  });

  beforeEach(async () => {
    await resetDb(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  function makeIo() {
    const out: string[] = [];
    const err: string[] = [];
    return {
      io: {
        useCase,
        stdout: (line: string) => out.push(line),
        stderr: (line: string) => err.push(line),
      },
      out,
      err,
    };
  }

  it('creates a superadmin who can then log in with the printed password', async () => {
    const { io, out } = makeIo();

    const code = await runSeedSuperadmin(
      ['--email', 'seeded@example.org', '--name', 'Seeded'],
      io,
    );
    expect(code).toBe(0);

    const passwordLine = out.find((l) => l.startsWith('password: '));
    const password = passwordLine!.replace('password: ', '');

    await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({ email: 'seeded@example.org', password })
      .expect(200);
  });

  it('returns exit code 1 without modifying the record on a repeat create', async () => {
    const { io: io1 } = makeIo();
    await runSeedSuperadmin(
      ['--email', 'repeat@example.org', '--name', 'Repeat'],
      io1,
    );

    const before = await prisma.superadmin.findUniqueOrThrow({
      where: { email: 'repeat@example.org' },
    });

    const { io: io2 } = makeIo();
    const code = await runSeedSuperadmin(
      ['--email', 'repeat@example.org', '--name', 'Repeat Again'],
      io2,
    );
    expect(code).toBe(1);

    const after = await prisma.superadmin.findUniqueOrThrow({
      where: { email: 'repeat@example.org' },
    });
    expect(after).toEqual(before);
  });

  it('--reset-password invalidates the old token and the new password works', async () => {
    const { io: io1, out: out1 } = makeIo();
    await runSeedSuperadmin(
      ['--email', 'reset@example.org', '--name', 'Reset'],
      io1,
    );
    const oldPassword = out1
      .find((l) => l.startsWith('password: '))!
      .replace('password: ', '');

    const loginRes = await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({ email: 'reset@example.org', password: oldPassword })
      .expect(200);
    const oldToken = loginRes.body.accessToken as string;

    const { io: io2, out: out2 } = makeIo();
    const code = await runSeedSuperadmin(
      ['--email', 'reset@example.org', '--reset-password'],
      io2,
    );
    expect(code).toBe(0);
    const newPassword = out2
      .find((l) => l.startsWith('password: '))!
      .replace('password: ', '');
    expect(newPassword).not.toBe(oldPassword);

    await request(app.getHttpServer())
      .get('/admin/me')
      .set('Authorization', `Bearer ${oldToken}`)
      .expect(401);

    await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({ email: 'reset@example.org', password: newPassword })
      .expect(200);
  });

  it('--reset-password for an unknown email returns exit code 1', async () => {
    const { io } = makeIo();
    const code = await runSeedSuperadmin(
      ['--email', 'ghost@example.org', '--reset-password'],
      io,
    );
    expect(code).toBe(1);
  });
});
