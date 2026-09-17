import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBookDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsUUID()
  seriesId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  volume?: number | null;
}

export class PatchBookDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  seriesId?: string | null;

  @IsOptional()
  volume?: number | null;
}

export class ArchiveBookQueryDto {
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  confirmInUse?: boolean = false;
}
