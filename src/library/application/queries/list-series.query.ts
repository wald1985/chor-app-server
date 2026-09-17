import { Inject, Injectable } from '@nestjs/common';
import {
  BOOK_REPOSITORY,
  BookRepository,
} from '../../domain/ports/book-repository.port';
import {
  SERIES_REPOSITORY,
  SeriesRepository,
} from '../../domain/ports/series-repository.port';
import { SeriesView } from '../views/library.views';
import { toSeriesView } from '../views/view-mappers';

@Injectable()
export class ListSeriesQuery {
  constructor(
    @Inject(SERIES_REPOSITORY)
    private readonly seriesRepo: SeriesRepository,
    @Inject(BOOK_REPOSITORY)
    private readonly bookRepo: BookRepository,
  ) {}

  async execute(options?: {
    includeArchived?: boolean;
  }): Promise<SeriesView[]> {
    const seriesList = await this.seriesRepo.findAll(options);
    const allBooks = await this.bookRepo.findAll({
      includeArchived: options?.includeArchived,
    });

    const booksBySeries = new Map<string, typeof allBooks>();
    for (const book of allBooks) {
      if (book.seriesId) {
        const list = booksBySeries.get(book.seriesId) ?? [];
        list.push(book);
        booksBySeries.set(book.seriesId, list);
      }
    }

    const views = seriesList.map((s) =>
      toSeriesView(s, booksBySeries.get(s.id) ?? []),
    );

    return views.sort((a, b) => a.title.localeCompare(b.title, 'de'));
  }
}
