import { Inject, Injectable } from '@nestjs/common';
import { LIBRARY_READER, type LibraryReader } from '../../../../library';
import { BookAttachment } from '../../../domain/entities/book-attachment.entity';
import {
  AttachmentAlreadyExistsError,
  RepertoireError,
} from '../../../domain/errors/repertoire.errors';
import {
  BOOK_ATTACHMENT_REPOSITORY,
  type BookAttachmentRepository,
} from '../../../domain/ports/book-attachment-repository.port';

export interface AttachBookCommand {
  communityId: string;
  libraryBookId: string;
}

@Injectable()
export class AttachBookUseCase {
  constructor(
    @Inject(BOOK_ATTACHMENT_REPOSITORY)
    private readonly bookAttachmentRepo: BookAttachmentRepository,
    @Inject(LIBRARY_READER)
    private readonly libraryReader: LibraryReader,
  ) {}

  async execute(command: AttachBookCommand): Promise<BookAttachment> {
    const books = await this.libraryReader.findBooks([command.libraryBookId]);
    if (books.length === 0) {
      throw new RepertoireError(
        `Library book not found: ${command.libraryBookId}`,
      );
    }
    const book = books[0];
    if (book.archived) {
      throw new RepertoireError(
        `Library book is archived: ${command.libraryBookId}`,
      );
    }

    const existing =
      await this.bookAttachmentRepo.findByCommunityAndLibraryBookId(
        command.communityId,
        command.libraryBookId,
      );

    if (existing) {
      if (!existing.isArchived) {
        throw new AttachmentAlreadyExistsError(
          command.communityId,
          command.libraryBookId,
        );
      }
      existing.restore();
      await this.bookAttachmentRepo.save(existing);
      return existing;
    }

    const attachment = BookAttachment.create({
      communityId: command.communityId,
      libraryBookId: command.libraryBookId,
    });

    await this.bookAttachmentRepo.save(attachment);
    return attachment;
  }
}
