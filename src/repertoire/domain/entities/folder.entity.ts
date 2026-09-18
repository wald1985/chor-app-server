import { randomUUID } from 'node:crypto';
import { FolderArchivedError } from '../errors/repertoire.errors';
import { FolderTitle } from '../value-objects/folder-title';

export interface FolderProps {
  id: string;
  communityId: string;
  title: FolderTitle;
  archivedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Folder {
  private constructor(private readonly props: FolderProps) {}

  static create(props: {
    id?: string;
    communityId: string;
    title: FolderTitle | string;
    archivedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }): Folder {
    const title =
      props.title instanceof FolderTitle
        ? props.title
        : new FolderTitle(props.title);

    return new Folder({
      id: props.id || randomUUID(),
      communityId: props.communityId,
      title,
      archivedAt: props.archivedAt ?? null,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
  }

  static reconstitute(props: {
    id: string;
    communityId: string;
    title: FolderTitle | string;
    archivedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }): Folder {
    const title =
      props.title instanceof FolderTitle
        ? props.title
        : new FolderTitle(props.title);

    return new Folder({
      id: props.id,
      communityId: props.communityId,
      title,
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

  get title(): FolderTitle {
    return this.props.title;
  }

  get titleValue(): string {
    return this.props.title.value;
  }

  get titleKey(): string {
    return this.props.title.key;
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

  rename(title: FolderTitle | string): void {
    this.assertNotArchived();
    this.props.title =
      title instanceof FolderTitle ? title : new FolderTitle(title);
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
      throw new FolderArchivedError(this.id);
    }
  }
}
