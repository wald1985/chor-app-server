export enum PersonRole {
  PIANIST = 'PIANIST',
  CONDUCTOR = 'CONDUCTOR',
}

export const ALL_PERSON_ROLES: readonly PersonRole[] = Object.freeze(
  Object.values(PersonRole),
);
