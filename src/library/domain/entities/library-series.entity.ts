import {
  SeriesArchivedError,
  SeriesHasActiveBooksError,
} from '../errors/library.errors';
import { LibraryTitle } from '../value-objects/library-title';

export interface LibrarySeriesProps {
  id: string;
  title: LibraryTitle;
  archivedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class LibrarySeries {
  private constructor(private readonly props: LibrarySeriesProps) {}

  static create(props: {
    id?: string;
    title: LibraryTitle | string;
    archivedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }): LibrarySeries {
    const title =
      props.title instanceof LibraryTitle
        ? props.title
        : new LibraryTitle(props.title);
    return new LibrarySeries({
      id: props.id ?? '',
      title,
      archivedAt: props.archivedAt ?? null,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get title(): LibraryTitle {
    return this.props.title;
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

  rename(title: LibraryTitle | string): void {
    this.assertNotArchived();
    this.props.title =
      title instanceof LibraryTitle ? title : new LibraryTitle(title);
  }

  archive(
    now: Date,
    activeBookCount: number,
    activeBookIds: string[] = [],
  ): void {
    if (this.isArchived) {
      return;
    }
    if (activeBookCount > 0 || activeBookIds.length > 0) {
      throw new SeriesHasActiveBooksError(activeBookIds);
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
      throw new SeriesArchivedError(this.id);
    }
  }
}
