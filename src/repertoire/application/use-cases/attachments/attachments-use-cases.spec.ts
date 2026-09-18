import { BookAttachment } from '../../../domain/entities/book-attachment.entity';
import {
  AttachmentAlreadyExistsError,
  AttachmentNotFoundError,
  RepertoireError,
} from '../../../domain/errors/repertoire.errors';
import { ArchiveAttachmentUseCase } from './archive-attachment.use-case';
import { AttachBookUseCase } from './attach-book.use-case';
import { DetachBookUseCase } from './detach-book.use-case';
import { GetAttachmentsUseCase } from './get-attachments.use-case';

describe('Attachment Use Cases', () => {
  let bookAttachmentRepo: {
    findById: jest.Mock;
    findByCommunityAndLibraryBookId: jest.Mock;
    findAllByCommunity: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let libraryReader: {
    findBooks: jest.Mock;
    findSongsByBookIds: jest.Mock;
    findSongs: jest.Mock;
    lookupSong: jest.Mock;
    findThemes: jest.Mock;
    listThemes: jest.Mock;
  };
  let attachBookUseCase: AttachBookUseCase;
  let archiveAttachmentUseCase: ArchiveAttachmentUseCase;
  let detachBookUseCase: DetachBookUseCase;
  let getAttachmentsUseCase: GetAttachmentsUseCase;

  beforeEach(() => {
    bookAttachmentRepo = {
      findById: jest.fn(),
      findByCommunityAndLibraryBookId: jest.fn(),
      findAllByCommunity: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    libraryReader = {
      findBooks: jest.fn(),
      findSongsByBookIds: jest.fn(),
      findSongs: jest.fn(),
      lookupSong: jest.fn(),
      findThemes: jest.fn(),
      listThemes: jest.fn(),
    };

    attachBookUseCase = new AttachBookUseCase(
      bookAttachmentRepo,
      libraryReader,
    );
    archiveAttachmentUseCase = new ArchiveAttachmentUseCase(bookAttachmentRepo);
    detachBookUseCase = new DetachBookUseCase(bookAttachmentRepo);
    getAttachmentsUseCase = new GetAttachmentsUseCase(
      bookAttachmentRepo,
      libraryReader,
    );
  });

  describe('AttachBookUseCase', () => {
    it('creates and saves new attachment when book is valid', async () => {
      libraryReader.findBooks.mockResolvedValue([
        {
          id: 'b-1',
          title: 'Liederbuch',
          seriesId: null,
          volume: null,
          archived: false,
        },
      ]);
      bookAttachmentRepo.findByCommunityAndLibraryBookId.mockResolvedValue(
        null,
      );

      const att = await attachBookUseCase.execute({
        communityId: 'c-1',
        libraryBookId: 'b-1',
      });

      expect(att.communityId).toBe('c-1');
      expect(att.libraryBookId).toBe('b-1');
      expect(bookAttachmentRepo.save).toHaveBeenCalledWith(att);
    });

    it('throws RepertoireError if book not found in library or archived', async () => {
      libraryReader.findBooks.mockResolvedValue([]);

      await expect(
        attachBookUseCase.execute({
          communityId: 'c-1',
          libraryBookId: 'b-404',
        }),
      ).rejects.toThrow(RepertoireError);

      libraryReader.findBooks.mockResolvedValue([
        { id: 'b-archived', title: 'Old', archived: true },
      ]);
      await expect(
        attachBookUseCase.execute({
          communityId: 'c-1',
          libraryBookId: 'b-archived',
        }),
      ).rejects.toThrow(RepertoireError);
    });

    it('restores existing archived attachment', async () => {
      libraryReader.findBooks.mockResolvedValue([
        { id: 'b-1', title: 'Liederbuch', archived: false },
      ]);
      const existing = BookAttachment.reconstitute({
        id: 'att-1',
        communityId: 'c-1',
        libraryBookId: 'b-1',
        archivedAt: new Date(),
      });
      bookAttachmentRepo.findByCommunityAndLibraryBookId.mockResolvedValue(
        existing,
      );

      const res = await attachBookUseCase.execute({
        communityId: 'c-1',
        libraryBookId: 'b-1',
      });

      expect(res.isArchived).toBe(false);
      expect(bookAttachmentRepo.save).toHaveBeenCalledWith(existing);
    });

    it('throws AttachmentAlreadyExistsError if attachment already active', async () => {
      libraryReader.findBooks.mockResolvedValue([
        { id: 'b-1', title: 'Liederbuch', archived: false },
      ]);
      const existing = BookAttachment.reconstitute({
        id: 'att-1',
        communityId: 'c-1',
        libraryBookId: 'b-1',
        archivedAt: null,
      });
      bookAttachmentRepo.findByCommunityAndLibraryBookId.mockResolvedValue(
        existing,
      );

      await expect(
        attachBookUseCase.execute({
          communityId: 'c-1',
          libraryBookId: 'b-1',
        }),
      ).rejects.toThrow(AttachmentAlreadyExistsError);
    });
  });

  describe('ArchiveAttachmentUseCase', () => {
    it('archives attachment', async () => {
      const att = BookAttachment.reconstitute({
        id: 'att-1',
        communityId: 'c-1',
        libraryBookId: 'b-1',
        archivedAt: null,
      });
      bookAttachmentRepo.findById.mockResolvedValue(att);

      const res = await archiveAttachmentUseCase.execute({
        communityId: 'c-1',
        attachmentId: 'att-1',
      });

      expect(res.isArchived).toBe(true);
      expect(bookAttachmentRepo.save).toHaveBeenCalledWith(att);
    });

    it('throws AttachmentNotFoundError if attachment not found', async () => {
      bookAttachmentRepo.findById.mockResolvedValue(null);

      await expect(
        archiveAttachmentUseCase.execute({
          communityId: 'c-1',
          attachmentId: 'att-404',
        }),
      ).rejects.toThrow(AttachmentNotFoundError);
    });
  });

  describe('DetachBookUseCase', () => {
    it('deletes attachment', async () => {
      const att = BookAttachment.reconstitute({
        id: 'att-1',
        communityId: 'c-1',
        libraryBookId: 'b-1',
      });
      bookAttachmentRepo.findById.mockResolvedValue(att);

      await detachBookUseCase.execute({
        communityId: 'c-1',
        attachmentId: 'att-1',
      });

      expect(bookAttachmentRepo.delete).toHaveBeenCalledWith('att-1');
    });
  });

  describe('GetAttachmentsUseCase', () => {
    it('returns attachments with book metadata', async () => {
      const att = BookAttachment.reconstitute({
        id: 'att-1',
        communityId: 'c-1',
        libraryBookId: 'b-1',
        archivedAt: null,
      });
      bookAttachmentRepo.findAllByCommunity.mockResolvedValue([att]);
      libraryReader.findBooks.mockResolvedValue([
        {
          id: 'b-1',
          title: 'Glaubenslieder',
          seriesId: null,
          volume: 1,
          archived: false,
        },
      ]);

      const res = await getAttachmentsUseCase.execute({ communityId: 'c-1' });
      expect(res).toHaveLength(1);
      expect(res[0].bookTitle).toBe('Glaubenslieder');
      expect(res[0].volume).toBe(1);
      expect(res[0].archived).toBe(false);
    });
  });
});
