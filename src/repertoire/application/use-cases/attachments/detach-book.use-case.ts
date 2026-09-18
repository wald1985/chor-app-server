import { Inject, Injectable } from '@nestjs/common';
import { AttachmentNotFoundError } from '../../../domain/errors/repertoire.errors';
import {
  BOOK_ATTACHMENT_REPOSITORY,
  type BookAttachmentRepository,
} from '../../../domain/ports/book-attachment-repository.port';

export interface DetachBookCommand {
  communityId: string;
  attachmentId: string;
}

@Injectable()
export class DetachBookUseCase {
  constructor(
    @Inject(BOOK_ATTACHMENT_REPOSITORY)
    private readonly bookAttachmentRepo: BookAttachmentRepository,
  ) {}

  async execute(command: DetachBookCommand): Promise<void> {
    const attachment = await this.bookAttachmentRepo.findById(
      command.attachmentId,
    );
    if (!attachment || attachment.communityId !== command.communityId) {
      throw new AttachmentNotFoundError(command.attachmentId);
    }

    await this.bookAttachmentRepo.delete(command.attachmentId);
  }
}
