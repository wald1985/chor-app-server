import { AdministratorPermissionsImmutableError } from '../errors/identity.errors';
import {
  ALL_COMMUNITY_PERMISSIONS,
  CommunityPermission,
} from '../value-objects/community-permission';
import { CommunityRole } from '../value-objects/community-role';
import { CommunityMembership } from './community-membership.entity';

describe('CommunityMembership', () => {
  describe('ADMINISTRATOR role', () => {
    it('effectivePermissions() returns all permissions and hasPermission(PEOPLE_MANAGE) is true even if stored permissions are empty', () => {
      const membership = new CommunityMembership({
        id: 'mem-1',
        userId: 'user-1',
        communityId: 'comm-1',
        role: CommunityRole.ADMINISTRATOR,
        permissions: [],
        createdAt: new Date(),
      });

      expect(membership.permissions).toEqual([]);
      expect(membership.effectivePermissions()).toEqual([
        ...ALL_COMMUNITY_PERMISSIONS,
      ]);
      expect(membership.hasPermission(CommunityPermission.PEOPLE_MANAGE)).toBe(
        true,
      );
    });

    it('setPermissions throws AdministratorPermissionsImmutableError', () => {
      const membership = new CommunityMembership({
        id: 'mem-1',
        userId: 'user-1',
        communityId: 'comm-1',
        role: CommunityRole.ADMINISTRATOR,
        createdAt: new Date(),
      });

      expect(() =>
        membership.setPermissions([CommunityPermission.PEOPLE_MANAGE]),
      ).toThrow(AdministratorPermissionsImmutableError);
    });
  });

  describe('MEMBER role', () => {
    it('has empty permissions by default', () => {
      const membership = new CommunityMembership({
        id: 'mem-2',
        userId: 'user-2',
        communityId: 'comm-1',
        role: CommunityRole.MEMBER,
        createdAt: new Date(),
      });

      expect(membership.permissions).toEqual([]);
      expect(membership.effectivePermissions()).toEqual([]);
      expect(membership.hasPermission(CommunityPermission.PEOPLE_MANAGE)).toBe(
        false,
      );
    });

    it('deduplicates permissions when calling setPermissions', () => {
      const membership = new CommunityMembership({
        id: 'mem-2',
        userId: 'user-2',
        communityId: 'comm-1',
        role: CommunityRole.MEMBER,
        createdAt: new Date(),
      });

      membership.setPermissions([
        CommunityPermission.PEOPLE_MANAGE,
        CommunityPermission.PEOPLE_MANAGE,
      ]);

      expect(membership.permissions).toEqual([
        CommunityPermission.PEOPLE_MANAGE,
      ]);
      expect(membership.effectivePermissions()).toEqual([
        CommunityPermission.PEOPLE_MANAGE,
      ]);
      expect(membership.hasPermission(CommunityPermission.PEOPLE_MANAGE)).toBe(
        true,
      );
    });

    it('deduplicates permissions provided in constructor', () => {
      const membership = new CommunityMembership({
        id: 'mem-3',
        userId: 'user-3',
        communityId: 'comm-1',
        role: CommunityRole.MEMBER,
        permissions: [
          CommunityPermission.PEOPLE_MANAGE,
          CommunityPermission.PEOPLE_MANAGE,
        ],
        createdAt: new Date(),
      });

      expect(membership.permissions).toEqual([
        CommunityPermission.PEOPLE_MANAGE,
      ]);
    });
  });
});
