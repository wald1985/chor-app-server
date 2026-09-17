import { Inject, Injectable } from '@nestjs/common';
import { UpdateSongChanges } from '../../../domain/entities/library-song.entity';
import {
  SongArchivedError,
  SongNotFoundError,
  SongNumberTakenError,
} from '../../../domain/errors/library.errors';
import {
  LIBRARY_UNIT_OF_WORK,
  LibraryUnitOfWork,
} from '../../../domain/ports/library-unit-of-work.port';
import {
  SONG_REPOSITORY,
  SongRepository,
} from '../../../domain/ports/song-repository.port';
import { SongNumber } from '../../../domain/value-objects/song-number';
import { SongTitle } from '../../../domain/value-objects/song-title';

export interface UpdateSongCommand {
  id: string;
  number?: string | number;
  title?: string;
  author?: string | null;
  arranger?: string | null;
}

@Injectable()
export class UpdateSongUseCase {
  constructor(
    @Inject(SONG_REPOSITORY)
    private readonly songRepo: SongRepository,
    @Inject(LIBRARY_UNIT_OF_WORK)
    private readonly uow: LibraryUnitOfWork,
  ) {}

  async execute(command: UpdateSongCommand): Promise<void> {
    await this.uow.run(async () => {
      const song = await this.songRepo.findById(command.id);
      if (!song) {
        throw new SongNotFoundError(command.id);
      }
      if (song.isArchived) {
        throw new SongArchivedError(command.id);
      }

      let hasChanges = false;
      if (command.number !== undefined) {
        const numberChanged = await this.handleRenumber(song, command.number);
        if (numberChanged) {
          hasChanges = true;
        }
      }

      const textChanges = this.buildTextChanges(song, command);
      if (textChanges !== null) {
        song.update(textChanges);
        hasChanges = true;
      }

      if (hasChanges) {
        await this.songRepo.save(song);
      }
    });
  }

  private async handleRenumber(
    song: {
      id: string;
      numberScopeId: string;
      numberValue: string;
      numberKey: string;
      renumber: (n: SongNumber) => void;
    },
    rawNumber: string | number,
  ): Promise<boolean> {
    const newNumber = new SongNumber(rawNumber);
    if (newNumber.value === song.numberValue) {
      return false;
    }
    if (newNumber.key !== song.numberKey) {
      const existing = await this.songRepo.findByScope(
        song.numberScopeId,
        newNumber.key,
      );
      if (existing && existing.id !== song.id) {
        throw new SongNumberTakenError(
          existing.id,
          existing.bookId,
          existing.isArchived,
        );
      }
    }
    song.renumber(newNumber);
    return true;
  }

  private buildTextChanges(
    song: {
      titleValue: string;
      authorValue: string | null;
      arrangerValue: string | null;
    },
    command: UpdateSongCommand,
  ): UpdateSongChanges | null {
    const changes: UpdateSongChanges = {};
    let changed = false;

    if (command.title !== undefined && command.title !== song.titleValue) {
      changes.title = new SongTitle(command.title);
      changed = true;
    }
    if (command.author !== undefined && command.author !== song.authorValue) {
      changes.author = command.author;
      changed = true;
    }
    if (
      command.arranger !== undefined &&
      command.arranger !== song.arrangerValue
    ) {
      changes.arranger = command.arranger;
      changed = true;
    }

    return changed ? changes : null;
  }
}
