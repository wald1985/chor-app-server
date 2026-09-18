import { ThemeSource } from '../value-objects/theme-source';

export interface SongThemeAssignmentProps {
  communityId: string;
  songId: string;
  themeSource: ThemeSource;
  themeId: string;
  createdAt?: Date;
}

export class SongThemeAssignment {
  private constructor(private readonly props: SongThemeAssignmentProps) {}

  static create(props: {
    communityId: string;
    songId: string;
    themeSource: ThemeSource;
    themeId: string;
    createdAt?: Date;
  }): SongThemeAssignment {
    return new SongThemeAssignment({
      communityId: props.communityId,
      songId: props.songId,
      themeSource: props.themeSource,
      themeId: props.themeId,
      createdAt: props.createdAt,
    });
  }

  get communityId(): string {
    return this.props.communityId;
  }

  get songId(): string {
    return this.props.songId;
  }

  get themeSource(): ThemeSource {
    return this.props.themeSource;
  }

  get themeId(): string {
    return this.props.themeId;
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }
}
