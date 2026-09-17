import { Inject, Injectable } from '@nestjs/common';
import { SongNotFoundError } from '../../../domain/errors/library.errors';
import { CLOCK } from '../../../domain/ports/clock.port';
import type { Clock } from '../../../domain/ports/clock.port';
import { LIBRARY_UNIT_OF_WORK } from '../../../domain/ports/library-unit-of-work.port';
import type { LibraryUnitOfWork } from '../../../domain/ports/library-unit-of-work.port';
import { SONG_REPOSITORY } from '../../../domain/ports/song-repository.port';
import type { SongRepository } from '../../../domain/ports/song-repository.port';

export interface ArchiveSongCommand {
  id: string;
}

@Injectable()
export class ArchiveSongUseCase {
  constructor(
    @Inject(SONG_REPOSITORY)
    private readonly songRepo: SongRepository,
    @Inject(LIBRARY_UNIT_OF_WORK)
    private readonly uow: LibraryUnitOfWork,
    @Inject(CLOCK)
    private readonly clock: Clock,
  ) {}

  async execute(command: ArchiveSongCommand): Promise<void> {
    await this.uow.run(async () => {
      const song = await this.songRepo.findById(command.id);
      if (!song) {
        throw new SongNotFoundError(command.id);
      }
      if (song.isArchived) {
        return;
      }

      song.archive(this.clock.now());
      await this.songRepo.save(song);
    });
  }
}
