import { Inject, Injectable } from '@nestjs/common';
import { BookAttachment } from '../../../domain/entities/book-attachment.entity';
import { AttachmentNotFoundError } from '../../../domain/errors/repertoire.errors';
import {
  BOOK_ATTACHMENT_REPOSITORY,
  type BookAttachmentRepository,
} from '../../../domain/ports/book-attachment-repository.port';

export interface ArchiveAttachmentCommand {
  communityId: string;
  attachmentId: string;
}

@Injectable()
export class ArchiveAttachmentUseCase {
  constructor(
    @Inject(BOOK_ATTACHMENT_REPOSITORY)
    private readonly bookAttachmentRepo: BookAttachmentRepository,
  ) {}

  async execute(command: ArchiveAttachmentCommand): Promise<BookAttachment> {
    const attachment = await this.bookAttachmentRepo.findById(
      command.attachmentId,
    );
    if (!attachment || attachment.communityId !== command.communityId) {
      throw new AttachmentNotFoundError(command.attachmentId);
    }

    attachment.archive(new Date());
    await this.bookAttachmentRepo.save(attachment);
    return attachment;
  }
}
