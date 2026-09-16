import { SetMetadata } from '@nestjs/common';
import { CommunityPermission } from '../../domain/value-objects/community-permission';
import { CommunityRole } from '../../domain/value-objects/community-role';

export const REQUIRE_PERMISSION_KEY = 'require_permission';
export const RequirePermission = (permission: CommunityPermission) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, permission);

export const REQUIRE_ROLE_KEY = 'require_role';
export const RequireRole = (role: CommunityRole) =>
  SetMetadata(REQUIRE_ROLE_KEY, role);
