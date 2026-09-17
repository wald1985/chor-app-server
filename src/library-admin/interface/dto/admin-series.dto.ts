import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateSeriesDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;
}

export class PatchSeriesDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;
}
