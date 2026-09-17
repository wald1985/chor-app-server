import { INestApplication } from '@nestjs/common';
import { SeedSuperadminUseCase } from '../../src/superadmin/application/use-cases/seed/seed-superadmin.use-case';
import type { SuperadminTokenIssuer } from '../../src/superadmin/domain/ports/superadmin-token-issuer.port';
import { SUPERADMIN_TOKEN_ISSUER } from '../../src/superadmin/domain/ports/superadmin-token-issuer.port';
import type { SuperadminRepository } from '../../src/superadmin/domain/ports/superadmin-repository.port';
import { SUPERADMIN_REPOSITORY } from '../../src/superadmin/domain/ports/superadmin-repository.port';

let counter = 0;
function uniqueSuffix(): string {
  counter += 1;
  return `${Date.now()}_${counter}`;
}

export interface CreatedSuperadmin {
  superadmin: { id: string; email: string; name: string };
  token: string;
  password: string;
}

/**
 * Creates a superadmin through SeedSuperadminUseCase (the same code path the
 * seed CLI uses) and issues it a token directly, bypassing the login HTTP
 * round trip for speed. Used as a fixture across superadmin e2e tests.
 */
export async function createSuperadmin(
  app: INestApplication,
  overrides?: Partial<{ email: string; name: string }>,
): Promise<CreatedSuperadmin> {
  const suffix = uniqueSuffix();
  const email = overrides?.email ?? `superadmin_${suffix}@example.com`;
  const name = overrides?.name ?? `Superadmin ${suffix}`;

  const seedUseCase = app.get(SeedSuperadminUseCase);
  const repo = app.get<SuperadminRepository>(SUPERADMIN_REPOSITORY);
  const issuer = app.get<SuperadminTokenIssuer>(SUPERADMIN_TOKEN_ISSUER);

  const seeded = await seedUseCase.execute({
    email,
    name,
    resetPassword: false,
  });
  const entity = await repo.findByEmail(seeded.email);
  if (!entity) {
    throw new Error('createSuperadmin: seeded superadmin not found');
  }

  const token = issuer.issue({
    sub: entity.id,
    email: entity.email,
    tokenVersion: entity.tokenVersion,
  });

  return {
    superadmin: { id: entity.id, email: entity.email, name: entity.name },
    token,
    password: seeded.password,
  };
}
