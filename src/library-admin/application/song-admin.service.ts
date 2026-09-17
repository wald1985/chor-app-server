import { Injectable } from '@nestjs/common';
import {
  CreateSongCommand,
  CreateSongUseCase,
  GetSongQuery,
  SetSongThemesCommand,
  SetSongThemesUseCase,
  SongView,
  UpdateSongCommand,
  UpdateSongUseCase,
} from '../../library';

@Injectable()
export class SongAdminService {
  constructor(
    private readonly createSongUseCase: CreateSongUseCase,
    private readonly updateSongUseCase: UpdateSongUseCase,
    private readonly setSongThemesUseCase: SetSongThemesUseCase,
    private readonly getSongQuery: GetSongQuery,
  ) {}

  async createSong(command: CreateSongCommand): Promise<SongView> {
    const song = await this.createSongUseCase.execute(command);
    return this.getSongQuery.execute(song.id);
  }

  async updateSong(command: UpdateSongCommand): Promise<void> {
    await this.updateSongUseCase.execute(command);
  }

  async setSongThemes(command: SetSongThemesCommand): Promise<void> {
    await this.setSongThemesUseCase.execute(command);
  }
}
