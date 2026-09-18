export interface BookAttachmentProps {
  id: string;
  communityId: string;
  libraryBookId: string;
  archivedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class BookAttachment {
  private constructor(private readonly props: BookAttachmentProps) {}

  static create(props: {
    id?: string;
    communityId: string;
    libraryBookId: string;
    archivedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }): BookAttachment {
    return new BookAttachment({
      id: props.id ?? '',
      communityId: props.communityId,
      libraryBookId: props.libraryBookId,
      archivedAt: props.archivedAt ?? null,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
  }

  static reconstitute(props: {
    id: string;
    communityId: string;
    libraryBookId: string;
    archivedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }): BookAttachment {
    return new BookAttachment({
      id: props.id,
      communityId: props.communityId,
      libraryBookId: props.libraryBookId,
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

  get libraryBookId(): string {
    return this.props.libraryBookId;
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
}
