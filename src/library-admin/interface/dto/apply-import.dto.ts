import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ApplyImportDto {
  @IsString()
  @IsNotEmpty()
  planHash!: string;

  @IsOptional()
  confirmInUse?: boolean | string;
}
