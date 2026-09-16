export enum CommunityPermission {
  PEOPLE_MANAGE = 'PEOPLE_MANAGE',
}

export const ALL_COMMUNITY_PERMISSIONS: readonly CommunityPermission[] =
  Object.freeze(Object.values(CommunityPermission));
