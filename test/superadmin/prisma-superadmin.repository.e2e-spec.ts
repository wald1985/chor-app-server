import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Superadmin } from '../../src/superadmin/domain/entities/superadmin.entity';
import {
  LastSuperadminError,
  SuperadminEmailTakenError,
  SuperadminNotFoundError,
} from '../../src/superadmin/domain/errors/superadmin.errors';
import type { SuperadminRepository } from '../../src/superadmin/domain/ports/superadmin-repository.port';
import { SUPERADMIN_REPOSITORY } from '../../src/superadmin/domain/ports/superadmin-repository.port';
import { PrismaService } from '../../src/shared/prisma/prisma.service';
import { createTestApp } from '../utils/create-test-app';
import { resetDb } from '../utils/reset-db';

function newSuperadmin(overrides?: {
  email?: string;
  name?: string;
}): Superadmin {
  return Superadmin.create({
    id: randomUUID(),
    email: overrides?.email ?? `sa_${randomUUID()}@example.org`,
    name: overrides?.name ?? 'Alex',
    passwordHash: 'hash',
  });
}

describe('PrismaSuperadminRepository (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let repo: SuperadminRepository;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    prisma = app.get(PrismaService);
    repo = app.get<SuperadminRepository>(SUPERADMIN_REPOSITORY);
  });

  beforeEach(async () => {
    await resetDb(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('resetDb cleans the superadmins table', async () => {
    await repo.create(newSuperadmin());
    await resetDb(prisma);
    expect(await repo.list()).toHaveLength(0);
  });

  it('rejects a duplicate email regardless of case on create', async () => {
    const sa = newSuperadmin({ email: 'alex@example.org' });
    await repo.create(sa);

    const dupe = newSuperadmin({ email: 'Alex@Example.ORG' });
    await expect(repo.create(dupe)).rejects.toThrow(SuperadminEmailTakenError);
  });

  it('rejects a duplicate email on save (rename to a taken email)', async () => {
    const a = newSuperadmin({ email: 'a@example.org' });
    const b = newSuperadmin({ email: 'b@example.org' });
    await repo.create(a);
    await repo.create(b);

    b.changeEmail('a@example.org');
    await expect(repo.save(b)).rejects.toThrow(SuperadminEmailTakenError);
  });

  it('updatePasswordHash increments tokenVersion by 1', async () => {
    const sa = newSuperadmin();
    await repo.create(sa);

    const newVersion = await repo.updatePasswordHash(sa.id, 'new-hash');
    expect(newVersion).toBe(1);

    const reloaded = await repo.findById(sa.id);
    expect(reloaded?.passwordHash).toBe('new-hash');
    expect(reloaded?.tokenVersion).toBe(1);
  });

  it('deletes when more than one superadmin remains', async () => {
    const a = newSuperadmin();
    const b = newSuperadmin();
    await repo.create(a);
    await repo.create(b);

    await repo.deleteKeepingAtLeastOne(a.id);

    const remaining = await repo.list();
    expect(remaining.map((s) => s.id)).toEqual([b.id]);
  });

  it('refuses to delete the last remaining superadmin', async () => {
    const only = newSuperadmin();
    await repo.create(only);

    await expect(repo.deleteKeepingAtLeastOne(only.id)).rejects.toThrow(
      LastSuperadminError,
    );
    expect(await repo.findById(only.id)).not.toBeNull();
  });

  it('throws SuperadminNotFoundError for an unknown id', async () => {
    await repo.create(newSuperadmin());
    await expect(repo.deleteKeepingAtLeastOne(randomUUID())).rejects.toThrow(
      SuperadminNotFoundError,
    );
  });

  it('two superadmins deleting each other concurrently leaves exactly one', async () => {
    const a = newSuperadmin();
    const b = newSuperadmin();
    await repo.create(a);
    await repo.create(b);

    const results = await Promise.allSettled([
      repo.deleteKeepingAtLeastOne(a.id),
      repo.deleteKeepingAtLeastOne(b.id),
    ]);

    const remaining = await repo.list();
    expect(remaining).toHaveLength(1);
    const succeeded = results.filter((r) => r.status === 'fulfilled');
    expect(succeeded).toHaveLength(1);
  });
});
