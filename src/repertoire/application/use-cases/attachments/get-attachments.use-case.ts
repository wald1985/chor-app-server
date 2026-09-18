import { Inject, Injectable } from '@nestjs/common';
import { LIBRARY_READER, type LibraryReader } from '../../../../library';
import {
  BOOK_ATTACHMENT_REPOSITORY,
  type BookAttachmentRepository,
} from '../../../domain/ports/book-attachment-repository.port';
import type { BookAttachmentView } from '../../views/repertoire.views';

export interface GetAttachmentsQuery {
  communityId: string;
  includeArchived?: boolean;
}

@Injectable()
export class GetAttachmentsUseCase {
  constructor(
    @Inject(BOOK_ATTACHMENT_REPOSITORY)
    private readonly bookAttachmentRepo: BookAttachmentRepository,
    @Inject(LIBRARY_READER)
    private readonly libraryReader: LibraryReader,
  ) {}

  async execute(query: GetAttachmentsQuery): Promise<BookAttachmentView[]> {
    const attachments = await this.bookAttachmentRepo.findAllByCommunity(
      query.communityId,
      { includeArchived: query.includeArchived },
    );

    const bookIds = attachments.map((a) => a.libraryBookId);
    const books = await this.libraryReader.findBooks(bookIds);
    const booksMap = new Map(books.map((b) => [b.id, b]));

    return attachments.map((att) => {
      const book = booksMap.get(att.libraryBookId);
      return {
        id: att.id,
        communityId: att.communityId,
        libraryBookId: att.libraryBookId,
        bookTitle: book?.title,
        seriesTitle: null,
        volume: book?.volume,
        archived: att.isArchived,
        archivedAt: att.archivedAt,
        createdAt: att.createdAt,
      };
    });
  }
}
