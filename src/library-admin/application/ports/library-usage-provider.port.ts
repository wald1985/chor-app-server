export type LibraryUsageRefType = 'BOOK' | 'SONG' | 'THEME';

export interface LibraryUsageItemRef {
  type: LibraryUsageRefType;
  id: string;
}

export interface LibraryItemUsage {
  ref: LibraryUsageItemRef;
  communities: number;
  references: number;
}

export interface LibraryUsageProvider {
  countUsage(refs: LibraryUsageItemRef[]): Promise<LibraryItemUsage[]>;
}

export const LIBRARY_USAGE_PROVIDER = Symbol('LIBRARY_USAGE_PROVIDER');
