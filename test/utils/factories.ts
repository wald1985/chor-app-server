import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

let counter = 0;
function uniqueSuffix(): string {
  counter += 1;
  return `${Date.now()}_${counter}`;
}

export interface RegisteredAdmin {
  user: {
    id: string;
    email: string;
    name: string;
  };
  communityId: string;
  communityName: string;
  role: string;
  token: string;
  password: string;
}

export async function createAdmin(
  app: INestApplication,
  overrides?: Partial<{
    email: string;
    password: string;
    name: string;
    communityName: string;
  }>,
): Promise<RegisteredAdmin> {
  const suffix = uniqueSuffix();
  const email = overrides?.email ?? `admin_${suffix}@example.com`;
  const password = overrides?.password ?? 'AdminPass123!';
  const name = overrides?.name ?? `Admin ${suffix}`;
  const communityName = overrides?.communityName ?? `Community ${suffix}`;

  const regRes = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email, password, name, communityName })
    .expect(201);

  const loginRes = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  return {
    user: (loginRes.body as { user: RegisteredAdmin['user'] }).user,
    communityId: (regRes.body as { communityId: string }).communityId,
    communityName: (regRes.body as { communityName: string }).communityName,
    role: (regRes.body as { role: string }).role,
    token: (loginRes.body as { accessToken: string }).accessToken,
    password,
  };
}

export interface MemberUser {
  user: {
    id: string;
    email: string;
    name: string;
  };
  membershipId: string;
  communityId: string;
  role: string;
  token: string;
  password: string;
}

export async function createMember(
  app: INestApplication,
  prisma: PrismaClient,
  communityId: string,
  overrides?: Partial<{
    email: string;
    password: string;
    name: string;
    permissions: string[];
  }>,
): Promise<MemberUser> {
  const suffix = uniqueSuffix();
  const email = overrides?.email ?? `member_${suffix}@example.com`;
  const password = overrides?.password ?? 'MemberPass123!';
  const name = overrides?.name ?? `Member ${suffix}`;

  await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email, password, name, communityName: `Dummy ${suffix}` })
    .expect(201);

  const loginRes = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  const user = (loginRes.body as { user: MemberUser['user'] }).user;

  const data: Record<string, any> = {
    userId: user.id,
    communityId,
    role: 'MEMBER',
  };
  if (overrides?.permissions) {
    data.permissions = overrides.permissions;
  }

  const membership = await (prisma.communityMembership as any).create({
    data,
  });

  const refreshedLogin = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  return {
    user,
    membershipId: membership.id as string,
    communityId,
    role: 'MEMBER',
    token: (refreshedLogin.body as { accessToken: string }).accessToken,
    password,
  };
}
