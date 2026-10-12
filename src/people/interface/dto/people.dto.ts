import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { PersonRole } from '../../domain/value-objects/person-role';

export class CreatePersonDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(PersonRole, { each: true })
  roles!: PersonRole[];
}

export class UpdatePersonDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(PersonRole, { each: true })
  roles?: PersonRole[];
}

export class ListPeopleQueryDto {
  @IsOptional()
  @IsEnum(PersonRole)
  role?: PersonRole;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === 'true')
  @IsBoolean()
  includeArchived?: boolean;
}
