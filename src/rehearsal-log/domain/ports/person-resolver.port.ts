export const PERSON_RESOLVER = Symbol('REHEARSAL_PERSON_RESOLVER');

export type LogPersonRole = 'PIANIST' | 'CONDUCTOR';

export interface PersonReference {
  id: string;
  name: string;
  roles: LogPersonRole[];
  archived: boolean;
}

export interface PersonResolver {
  /** People of the Community by id, archived ones included; unknown ids are omitted. */
  findMany(communityId: string, ids: string[]): Promise<PersonReference[]>;
}
