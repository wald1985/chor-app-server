import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateFolderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;
}

export class UpdateFolderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;
}
