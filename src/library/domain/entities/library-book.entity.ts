import { BookArchivedError } from '../errors/library.errors';
import { BookPlacement } from '../value-objects/book-placement';
import { LibraryTitle } from '../value-objects/library-title';
import { Volume } from '../value-objects/volume';

export interface LibraryBookProps {
  id: string;
  title: LibraryTitle;
  seriesId?: string | null;
  volume?: Volume | null;
  archivedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class LibraryBook {
  private constructor(private readonly props: LibraryBookProps) {}

  static create(props: {
    id?: string;
    title: LibraryTitle | string;
    placement?:
      | BookPlacement
      | { seriesId?: string | null; volume?: Volume | number | null };
    archivedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }): LibraryBook {
    const title =
      props.title instanceof LibraryTitle
        ? props.title
        : new LibraryTitle(props.title);
    let seriesId: string | null = null;
    let volume: Volume | null = null;

    if (props.placement) {
      const placement =
        props.placement instanceof BookPlacement
          ? props.placement
          : new BookPlacement({
              seriesId: props.placement.seriesId ?? null,
              volume: props.placement.volume ?? null,
            });
      seriesId = placement.seriesId;
      volume = placement.volume;
    }

    return new LibraryBook({
      id: props.id ?? '',
      title,
      seriesId,
      volume,
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

  get seriesId(): string | null {
    return this.props.seriesId ?? null;
  }

  get volume(): Volume | null {
    return this.props.volume ?? null;
  }

  get volumeValue(): number | null {
    return this.props.volume ? this.props.volume.value : null;
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

  numberScopeId(): string {
    return this.props.seriesId ?? this.props.id;
  }

  placement(): BookPlacement {
    return new BookPlacement({
      seriesId: this.props.seriesId ?? null,
      volume: this.props.volume ?? null,
    });
  }

  rename(title: LibraryTitle | string): void {
    this.assertNotArchived();
    this.props.title =
      title instanceof LibraryTitle ? title : new LibraryTitle(title);
  }

  place(placement: BookPlacement): void {
    this.assertNotArchived();
    this.props.seriesId = placement.seriesId;
    this.props.volume = placement.volume;
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
      throw new BookArchivedError(this.id);
    }
  }
}
