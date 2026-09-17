import { Superadmin } from '../../domain/entities/superadmin.entity';

export interface SuperadminView {
  id: string;
  email: string;
  name: string;
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function toSuperadminView(
  superadmin: Superadmin,
  actorId: string,
): SuperadminView {
  return {
    id: superadmin.id,
    email: superadmin.email,
    name: superadmin.name,
    isCurrent: superadmin.id === actorId,
    createdAt: superadmin.createdAt,
    updatedAt: superadmin.updatedAt,
  };
}
