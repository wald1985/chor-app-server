export enum CommunityPermission {
  PEOPLE_MANAGE = 'PEOPLE_MANAGE',
  REPERTOIRE_MANAGE = 'REPERTOIRE_MANAGE',
  SINGING_LOG_MANAGE = 'SINGING_LOG_MANAGE',
}

export const ALL_COMMUNITY_PERMISSIONS: readonly CommunityPermission[] =
  Object.freeze(Object.values(CommunityPermission));
