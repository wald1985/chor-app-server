import { IsArray, IsEnum } from 'class-validator';
import { CommunityPermission } from '../../domain/value-objects/community-permission';

export class SetMemberPermissionsDto {
  @IsArray()
  @IsEnum(CommunityPermission, { each: true })
  permissions: CommunityPermission[];
}
