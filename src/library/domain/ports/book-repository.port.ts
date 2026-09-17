import { LibraryBook } from '../entities/library-book.entity';

export interface BookRepository {
  findById(id: string): Promise<LibraryBook | null>;
  findByTitleKey(titleKey: string): Promise<LibraryBook | null>;
  findBySeriesAndVolume(
    seriesId: string,
    volume: number,
  ): Promise<LibraryBook | null>;
  findAll(options?: {
    seriesId?: string;
    search?: string;
    includeArchived?: boolean;
  }): Promise<LibraryBook[]>;
  findByIds(ids: string[]): Promise<LibraryBook[]>;
  countActiveBySeriesId(seriesId: string): Promise<number>;
  findActiveIdsBySeriesId(seriesId: string): Promise<string[]>;
  save(book: LibraryBook): Promise<void>;
  create(book: LibraryBook): Promise<void>;
}

export const BOOK_REPOSITORY = Symbol('BOOK_REPOSITORY');
