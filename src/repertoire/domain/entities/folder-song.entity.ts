import { randomUUID } from 'node:crypto';
import {
  FolderArchivedError,
  FolderSongArchivedError,
} from '../errors/repertoire.errors';
import { OptionalText } from '../value-objects/optional-text';
import { SongNumber } from '../value-objects/song-number';
import { SongTitle } from '../value-objects/song-title';
import { Folder } from './folder.entity';

export interface FolderSongProps {
  id: string;
  communityId: string;
  folderId: string;
  number: SongNumber;
  title: SongTitle;
  author: OptionalText;
  arranger: OptionalText;
  isNew: boolean;
  archivedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateFolderSongProps {
  id?: string;
  number: SongNumber | string | number;
  title: SongTitle | string;
  author?: OptionalText | string | null;
  arranger?: OptionalText | string | null;
  isNew?: boolean;
  archivedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UpdateFolderSongChanges {
  title?: SongTitle | string;
  author?: OptionalText | string | null;
  arranger?: OptionalText | string | null;
  isNew?: boolean;
}

export class FolderSong {
  private constructor(private readonly props: FolderSongProps) {}

  static create(folder: Folder, props: CreateFolderSongProps): FolderSong {
    if (folder.isArchived) {
      throw new FolderArchivedError(folder.id);
    }
    const number =
      props.number instanceof SongNumber
        ? props.number
        : new SongNumber(props.number);
    const title =
      props.title instanceof SongTitle
        ? props.title
        : new SongTitle(props.title);
    const author =
      props.author instanceof OptionalText
        ? props.author
        : new OptionalText(props.author, 'author');
    const arranger =
      props.arranger instanceof OptionalText
        ? props.arranger
        : new OptionalText(props.arranger, 'arranger');

    return new FolderSong({
      id: props.id || randomUUID(),
      communityId: folder.communityId,
      folderId: folder.id,
      number,
      title,
      author,
      arranger,
      isNew: props.isNew ?? false,
      archivedAt: props.archivedAt ?? null,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
  }

  static reconstitute(props: {
    id: string;
    communityId: string;
    folderId: string;
    number: SongNumber | string | number;
    title: SongTitle | string;
    author?: OptionalText | string | null;
    arranger?: OptionalText | string | null;
    isNew?: boolean;
    archivedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }): FolderSong {
    const number =
      props.number instanceof SongNumber
        ? props.number
        : new SongNumber(props.number);
    const title =
      props.title instanceof SongTitle
        ? props.title
        : new SongTitle(props.title);
    const author =
      props.author instanceof OptionalText
        ? props.author
        : new OptionalText(props.author, 'author');
    const arranger =
      props.arranger instanceof OptionalText
        ? props.arranger
        : new OptionalText(props.arranger, 'arranger');

    return new FolderSong({
      id: props.id,
      communityId: props.communityId,
      folderId: props.folderId,
      number,
      title,
      author,
      arranger,
      isNew: props.isNew ?? false,
      archivedAt: props.archivedAt ?? null,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get communityId(): string {
    return this.props.communityId;
  }

  get folderId(): string {
    return this.props.folderId;
  }

  get number(): SongNumber {
    return this.props.number;
  }

  get numberValue(): string {
    return this.props.number.value;
  }

  get numberKey(): string {
    return this.props.number.key;
  }

  get sortKey(): string {
    return this.props.number.sortKey;
  }

  get title(): SongTitle {
    return this.props.title;
  }

  get titleValue(): string {
    return this.props.title.value;
  }

  get author(): OptionalText {
    return this.props.author;
  }

  get authorValue(): string | null {
    return this.props.author.value;
  }

  get arranger(): OptionalText {
    return this.props.arranger;
  }

  get arrangerValue(): string | null {
    return this.props.arranger.value;
  }

  get isNew(): boolean {
    return this.props.isNew;
  }

  get archivedAt(): Date | null {
    return this.props.archivedAt ?? null;
  }

  get isArchived(): boolean {
    return (
      this.props.archivedAt !== null && this.props.archivedAt !== undefined
    );
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  get updatedAt(): Date | undefined {
    return this.props.updatedAt;
  }

  update(changes: UpdateFolderSongChanges): void {
    this.assertNotArchived();
    if (changes.title !== undefined) {
      this.props.title =
        changes.title instanceof SongTitle
          ? changes.title
          : new SongTitle(changes.title);
    }
    if (changes.author !== undefined) {
      this.props.author =
        changes.author instanceof OptionalText
          ? changes.author
          : new OptionalText(changes.author, 'author');
    }
    if (changes.arranger !== undefined) {
      this.props.arranger =
        changes.arranger instanceof OptionalText
          ? changes.arranger
          : new OptionalText(changes.arranger, 'arranger');
    }
    if (changes.isNew !== undefined) {
      this.props.isNew = changes.isNew;
    }
  }

  renumber(number: SongNumber | string | number): void {
    this.assertNotArchived();
    this.props.number =
      number instanceof SongNumber ? number : new SongNumber(number);
  }

  archive(now: Date): void {
    if (this.isArchived) {
      return;
    }
    this.props.archivedAt = now;
  }

  restore(): void {
    if (!this.isArchived) {
      return;
    }
    this.props.archivedAt = null;
  }

  private assertNotArchived(): void {
    if (this.isArchived) {
      throw new FolderSongArchivedError(this.id);
    }
  }
}
