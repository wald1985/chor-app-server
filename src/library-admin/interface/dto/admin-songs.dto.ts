import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateSongDto {
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
  @IsArray()
  @IsUUID('all', { each: true })
  themeIds?: string[];
}

export class PatchSongDto {
  @IsOptional()
  @IsNotEmpty()
  number?: string | number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  author?: string | null;

  @IsOptional()
  arranger?: string | null;
}

export class SetSongThemesDto {
  @IsArray()
  @IsUUID('all', { each: true })
  themeIds!: string[];
}

export class ArchiveSongQueryDto {
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  confirmInUse?: boolean = false;
}
