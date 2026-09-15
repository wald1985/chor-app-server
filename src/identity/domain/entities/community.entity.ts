export interface CommunityProps {
  id: string;
  name: string;
  createdAt: Date;
}

export class Community {
  constructor(private readonly props: CommunityProps) {}

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
