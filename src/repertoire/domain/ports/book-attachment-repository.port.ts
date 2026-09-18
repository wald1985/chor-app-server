import { BookAttachment } from '../entities/book-attachment.entity';

export const BOOK_ATTACHMENT_REPOSITORY = Symbol('BOOK_ATTACHMENT_REPOSITORY');

export interface BookAttachmentRepository {
  findById(id: string): Promise<BookAttachment | null>;
  findByCommunityAndLibraryBookId(
    communityId: string,
    libraryBookId: string,
  ): Promise<BookAttachment | null>;
  findAllByCommunity(
    communityId: string,
    options?: { includeArchived?: boolean },
  ): Promise<BookAttachment[]>;
  save(attachment: BookAttachment): Promise<void>;
  delete(id: string): Promise<void>;
}
