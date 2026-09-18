import { ThemeArchivedError } from '../errors/repertoire.errors';
import { ThemeName } from '../value-objects/theme-name';

export interface ThemeProps {
  id: string;
  communityId: string;
  name: ThemeName;
  archivedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Theme {
  private constructor(private readonly props: ThemeProps) {}

  static create(props: {
    id?: string;
    communityId: string;
    name: ThemeName | string;
    archivedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }): Theme {
    const name =
      props.name instanceof ThemeName ? props.name : new ThemeName(props.name);

    return new Theme({
      id: props.id ?? '',
      communityId: props.communityId,
      name,
      archivedAt: props.archivedAt ?? null,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
  }

  static reconstitute(props: {
    id: string;
    communityId: string;
    name: ThemeName | string;
    archivedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }): Theme {
    const name =
      props.name instanceof ThemeName ? props.name : new ThemeName(props.name);

    return new Theme({
      id: props.id,
      communityId: props.communityId,
      name,
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
