import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateFolderSongDto {
  @IsNotEmpty()
  number!: string | number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  author?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  arranger?: string | null;

  @IsOptional()
  @IsBoolean()
  isNew?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  themeIds?: string[];
}

export class UpdateFolderSongDto {
  @IsOptional()
  @IsNotEmpty()
  number?: string | number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  author?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  arranger?: string | null;

  @IsOptional()
  @IsBoolean()
  isNew?: boolean;
}
