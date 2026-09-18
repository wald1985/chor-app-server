import { ThemeSource } from '../../domain/value-objects/theme-source';

export interface CommunitySongThemeView {
  source: ThemeSource;
  id: string;
  name: string;
}

export interface CommunitySongContainerView {
  id: string;
  title: string;
  type: 'BOOK' | 'FOLDER';
  seriesId?: string | null;
}

export interface CommunitySongView {
  id: string;
  source: ThemeSource;
  container: CommunitySongContainerView;
  number: string;
  title: string;
  author: string | null;
  arranger: string | null;
  isNew: boolean;
  themes: CommunitySongThemeView[];
  archived: boolean;
}

export interface BookAttachmentView {
  id: string;
  communityId: string;
  libraryBookId: string;
  bookTitle?: string;
  seriesTitle?: string | null;
  volume?: number | null;
  archived: boolean;
  archivedAt?: Date | null;
  createdAt?: Date;
}

export interface FolderView {
  id: string;
  communityId: string;
  title: string;
  archived: boolean;
  archivedAt?: Date | null;
  createdAt?: Date;
}
