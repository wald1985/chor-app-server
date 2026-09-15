import { CommunityRole } from '../value-objects/community-role';

export interface CommunityMembershipProps {
  id: string;
  userId: string;
  communityId: string;
  role: CommunityRole;
  createdAt: Date;
}

export class CommunityMembership {
  constructor(private readonly props: CommunityMembershipProps) {}

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get communityId(): string {
    return this.props.communityId;
  }

  get role(): CommunityRole {
    return this.props.role;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
