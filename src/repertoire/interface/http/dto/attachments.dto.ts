import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateAttachmentDto {
  @IsUUID()
  @IsNotEmpty()
  libraryBookId!: string;
}
