import { Inject, Injectable } from '@nestjs/common';
import {
  BookArchivedError,
  BookNotFoundError,
  NumberScopeConflictError,
  SeriesArchivedError,
  SeriesNotFoundError,
  VolumeTakenError,
} from '../../../domain/errors/library.errors';
import { BOOK_REPOSITORY } from '../../../domain/ports/book-repository.port';
import type { BookRepository } from '../../../domain/ports/book-repository.port';
import { LIBRARY_UNIT_OF_WORK } from '../../../domain/ports/library-unit-of-work.port';
import type { LibraryUnitOfWork } from '../../../domain/ports/library-unit-of-work.port';
import { SERIES_REPOSITORY } from '../../../domain/ports/series-repository.port';
import type { SeriesRepository } from '../../../domain/ports/series-repository.port';
import { SONG_REPOSITORY } from '../../../domain/ports/song-repository.port';
import type { SongRepository } from '../../../domain/ports/song-repository.port';
import { BookPlacement } from '../../../domain/value-objects/book-placement';
import { Volume } from '../../../domain/value-objects/volume';

export interface PlaceBookCommand {
  bookId: string;
  seriesId: string | null;
  volume: number | null;
}

@Injectable()
export class PlaceBookUseCase {
  constructor(
    @Inject(BOOK_REPOSITORY)
    private readonly bookRepo: BookRepository,
    @Inject(SERIES_REPOSITORY)
    private readonly seriesRepo: SeriesRepository,
    @Inject(SONG_REPOSITORY)
    private readonly songRepo: SongRepository,
    @Inject(LIBRARY_UNIT_OF_WORK)
    private readonly uow: LibraryUnitOfWork,
  ) {}

  async execute(command: PlaceBookCommand): Promise<void> {
    await this.uow.run(async () => {
      const book = await this.bookRepo.findById(command.bookId);
      if (!book) {
        throw new BookNotFoundError(command.bookId);
      }
      if (book.isArchived) {
        throw new BookArchivedError(command.bookId);
      }

      const placement = new BookPlacement({
        seriesId: command.seriesId,
        volume: command.volume !== null ? new Volume(command.volume) : null,
      });

      if (
        this.isPlacementUnchanged(book.seriesId, book.volumeValue, placement)
      ) {
        return;
      }

      await this.validateTargetSeries(placement, book.id);
      await this.rescopeSongsIfNeeded(
        book.id,
        book.numberScopeId(),
        placement.seriesId ?? book.id,
      );

      book.place(placement);
      await this.bookRepo.save(book);
    });
  }

  private isPlacementUnchanged(
    currentSeriesId: string | null,
    currentVolume: number | null,
    newPlacement: BookPlacement,
  ): boolean {
    const newVol = newPlacement.volume ? newPlacement.volume.value : null;
    return (
      currentSeriesId === newPlacement.seriesId && currentVolume === newVol
    );
  }

  private async validateTargetSeries(
    placement: BookPlacement,
    bookId: string,
  ): Promise<void> {
    if (placement.seriesId === null) {
      return;
    }
    const series = await this.seriesRepo.findById(placement.seriesId);
    if (!series) {
      throw new SeriesNotFoundError(placement.seriesId);
    }
    if (series.isArchived) {
      throw new SeriesArchivedError(placement.seriesId);
    }

    const existingVol = await this.bookRepo.findBySeriesAndVolume(
      placement.seriesId,
      placement.volume!.value,
    );
    if (existingVol && existingVol.id !== bookId) {
      throw new VolumeTakenError(existingVol.id);
    }
  }

  private async rescopeSongsIfNeeded(
    bookId: string,
    currentScopeId: string,
    targetScopeId: string,
  ): Promise<void> {
    if (currentScopeId === targetScopeId) {
      return;
    }
    const targetKeys = new Set(
      await this.songRepo.findNumberKeys(targetScopeId),
    );
    const bookSongs = await this.songRepo.listByBookIds([bookId], {
      includeArchived: true,
    });
    const conflicts = bookSongs
      .filter((s) => targetKeys.has(s.numberKey))
      .map((s) => s.numberValue);

    if (conflicts.length > 0) {
      throw new NumberScopeConflictError(conflicts);
    }

    await this.songRepo.rescope(bookId, targetScopeId);
  }
}
