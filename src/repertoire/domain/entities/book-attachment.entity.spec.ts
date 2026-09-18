import { BookAttachment } from './book-attachment.entity';

describe('BookAttachment Entity', () => {
  it('creates and archives/restores attachment', () => {
    const attachment = BookAttachment.create({
      communityId: 'comm-1',
      libraryBookId: 'book-1',
    });

    expect(attachment.communityId).toBe('comm-1');
    expect(attachment.libraryBookId).toBe('book-1');
    expect(attachment.isArchived).toBe(false);

    const now = new Date();
    attachment.archive(now);
    expect(attachment.isArchived).toBe(true);
    expect(attachment.archivedAt).toBe(now);

    attachment.restore();
    expect(attachment.isArchived).toBe(false);
    expect(attachment.archivedAt).toBeNull();
  });
});
