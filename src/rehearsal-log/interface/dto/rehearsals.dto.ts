import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreateRehearsalDto {
  @Matches(DATE_PATTERN, { message: 'date must be YYYY-MM-DD' })
  date!: string;

  @IsOptional()
  @IsUUID()
  warmUpLeaderId?: string | null;

  @IsOptional()
  @IsString()
  note?: string | null;
}

/** The date is intentionally absent: it cannot be changed (unknown fields are stripped). */
export class UpdateRehearsalDto {
  @IsOptional()
  @IsUUID()
  warmUpLeaderId?: string | null;

  @IsOptional()
  @IsString()
  note?: string | null;
}

export class AddRehearsalEntryDto {
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

export class ListRehearsalsQueryDto {
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'from must be YYYY-MM-DD' })
  from?: string;

  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'to must be YYYY-MM-DD' })
  to?: string;
}
