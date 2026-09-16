import { AdministratorPermissionsImmutableError } from '../errors/identity.errors';
import {
  ALL_COMMUNITY_PERMISSIONS,
  CommunityPermission,
} from '../value-objects/community-permission';
import { CommunityRole } from '../value-objects/community-role';

export interface CommunityMembershipProps {
  id: string;
  userId: string;
  communityId: string;
  role: CommunityRole;
  permissions?: CommunityPermission[];
  createdAt: Date;
}

export class CommunityMembership {
  private permissionsList: CommunityPermission[];

  constructor(private readonly props: CommunityMembershipProps) {
    this.permissionsList = props.permissions
      ? Array.from(new Set(props.permissions))
      : [];
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get communityId(): string {
    return this.props.communityId;
  }

  get role(): CommunityRole {
    return this.props.role;
  }

  get permissions(): CommunityPermission[] {
    return [...this.permissionsList];
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  effectivePermissions(): CommunityPermission[] {
    if (this.props.role === CommunityRole.ADMINISTRATOR) {
      return [...ALL_COMMUNITY_PERMISSIONS];
    }
    return [...this.permissionsList];
  }

  hasPermission(permission: CommunityPermission): boolean {
    return this.effectivePermissions().includes(permission);
  }

  setPermissions(permissions: CommunityPermission[]): void {
    if (this.props.role === CommunityRole.ADMINISTRATOR) {
      throw new AdministratorPermissionsImmutableError();
    }
    this.permissionsList = Array.from(new Set(permissions));
  }
}
