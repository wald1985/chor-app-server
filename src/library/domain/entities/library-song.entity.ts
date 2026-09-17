import { BookArchivedError, SongArchivedError } from '../errors/library.errors';
import { OptionalText } from '../value-objects/optional-text';
import { SongNumber } from '../value-objects/song-number';
import { SongTitle } from '../value-objects/song-title';
import { LibraryBook } from './library-book.entity';

export interface LibrarySongProps {
  id: string;
  bookId: string;
  numberScopeId: string;
  number: SongNumber;
  title: SongTitle;
  author: OptionalText;
  arranger: OptionalText;
  themeIds: string[];
  archivedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateSongProps {
  id?: string;
  number: SongNumber | string | number;
  title: SongTitle | string;
  author?: OptionalText | string | null;
  arranger?: OptionalText | string | null;
  themeIds?: string[];
  archivedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UpdateSongChanges {
  title?: SongTitle | string;
  author?: OptionalText | string | null;
  arranger?: OptionalText | string | null;
}

export class LibrarySong {
  private constructor(private readonly props: LibrarySongProps) {}

  static create(book: LibraryBook, props: CreateSongProps): LibrarySong {
    if (book.isArchived) {
      throw new BookArchivedError(book.id);
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
    const themeIds = Array.from(new Set(props.themeIds ?? []));

    return new LibrarySong({
      id: props.id ?? '',
      bookId: book.id,
      numberScopeId: book.numberScopeId(),
      number,
      title,
      author,
      arranger,
      themeIds,
      archivedAt: props.archivedAt ?? null,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
  }

  static reconstitute(props: {
    id: string;
    bookId: string;
    numberScopeId: string;
    number: SongNumber | string | number;
    title: SongTitle | string;
    author?: OptionalText | string | null;
    arranger?: OptionalText | string | null;
    themeIds?: string[];
    archivedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }): LibrarySong {
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
    const themeIds = Array.from(new Set(props.themeIds ?? []));

    return new LibrarySong({
      id: props.id,
      bookId: props.bookId,
      numberScopeId: props.numberScopeId,
      number,
      title,
      author,
      arranger,
      themeIds,
      archivedAt: props.archivedAt ?? null,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get bookId(): string {
    return this.props.bookId;
  }

  get numberScopeId(): string {
    return this.props.numberScopeId;
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

  get themeIds(): string[] {
    return [...this.props.themeIds];
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

  update(changes: UpdateSongChanges): void {
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
  }

  renumber(number: SongNumber | string | number): void {
    this.assertNotArchived();
    this.props.number =
      number instanceof SongNumber ? number : new SongNumber(number);
  }

  moveTo(book: LibraryBook): void {
    this.assertNotArchived();
    this.props.bookId = book.id;
    this.props.numberScopeId = book.numberScopeId();
  }

  setThemes(themeIds: string[]): void {
    this.assertNotArchived();
    this.props.themeIds = Array.from(new Set(themeIds));
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
      throw new SongArchivedError(this.id);
    }
  }
}
