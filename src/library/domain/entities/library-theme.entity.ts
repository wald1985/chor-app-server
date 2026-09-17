import { ThemeArchivedError } from '../errors/library.errors';
import { ThemeName } from '../value-objects/theme-name';

export interface LibraryThemeProps {
  id: string;
  name: ThemeName;
  archivedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class LibraryTheme {
  private constructor(private readonly props: LibraryThemeProps) {}

  static create(props: {
    id?: string;
    name: ThemeName | string;
    archivedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }): LibraryTheme {
    const name =
      props.name instanceof ThemeName ? props.name : new ThemeName(props.name);
    return new LibraryTheme({
      id: props.id ?? '',
      name,
      archivedAt: props.archivedAt ?? null,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get name(): ThemeName {
    return this.props.name;
  }

  get nameValue(): string {
    return this.props.name.value;
  }

  get nameKey(): string {
    return this.props.name.key;
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

  rename(name: ThemeName | string): void {
    this.assertNotArchived();
    this.props.name = name instanceof ThemeName ? name : new ThemeName(name);
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
      throw new ThemeArchivedError(this.id);
    }
  }
}
