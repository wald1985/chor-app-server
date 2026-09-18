import {
  IsArray,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateThemeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}

export class SetSongThemesDto {
  @IsArray()
  @IsUUID('all', { each: true })
  themeIds!: string[];
}
