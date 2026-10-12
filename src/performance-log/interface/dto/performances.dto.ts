import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class RecordPerformanceDto {
  @Matches(DATE_PATTERN, { message: 'date must be YYYY-MM-DD' })
  date!: string;

  @IsUUID()
  songId!: string;

  @IsOptional()
  @IsUUID()
  pianistId?: string | null;

  @IsOptional()
  @IsUUID()
  conductorId?: string | null;

  @IsOptional()
  @IsString()
  note?: string | null;
}

export class ListPerformancesQueryDto {
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'from must be YYYY-MM-DD' })
  from?: string;

  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'to must be YYYY-MM-DD' })
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
