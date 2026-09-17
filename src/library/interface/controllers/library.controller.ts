import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserOrSuperadminAuthGuard } from '../../../superadmin';
import { GetBookQuery } from '../../application/queries/get-book.query';
import { GetSongQuery } from '../../application/queries/get-song.query';
import { ListBooksQuery } from '../../application/queries/list-books.query';
import { ListSeriesQuery } from '../../application/queries/list-series.query';
import { ListThemesQuery } from '../../application/queries/list-themes.query';
import { LookupSongQuery } from '../../application/queries/lookup-song.query';
import {
  GetBookQueryDto,
  ListBooksQueryDto,
  ListSeriesQueryDto,
  ListThemesQueryDto,
  LookupSongQueryDto,
} from '../dto/library-query.dto';
import { toLibraryHttpException } from '../http/library-error-mapper';

@Controller('library')
@UseGuards(UserOrSuperadminAuthGuard)
export class LibraryController {
  // eslint-disable-next-line max-params -- LibraryController injects 6 query handlers
  constructor(
    private readonly listSeriesQuery: ListSeriesQuery,
    private readonly listBooksQuery: ListBooksQuery,
    private readonly getBookQuery: GetBookQuery,
    private readonly lookupSongQuery: LookupSongQuery,
    private readonly getSongQuery: GetSongQuery,
    private readonly listThemesQuery: ListThemesQuery,
  ) {}

  @Get('series')
  async listSeries(@Query() dto: ListSeriesQueryDto) {
    try {
      return await this.listSeriesQuery.execute(dto);
    } catch (error) {
      throw toLibraryHttpException(error);
    }
  }

  @Get('books')
  async listBooks(@Query() dto: ListBooksQueryDto) {
    try {
      return await this.listBooksQuery.execute(dto);
    } catch (error) {
      throw toLibraryHttpException(error);
    }
  }

  @Get('books/:bookId')
  async getBook(
    @Param('bookId', ParseUUIDPipe) bookId: string,
    @Query() dto: GetBookQueryDto,
  ) {
    try {
      return await this.getBookQuery.execute(bookId, dto);
    } catch (error) {
      throw toLibraryHttpException(error);
    }
  }

  @Get('songs/lookup')
  async lookupSong(@Query() dto: LookupSongQueryDto) {
    try {
      const song = await this.lookupSongQuery.execute(dto);
      if (!song) {
        throw new NotFoundException({
          statusCode: 404,
          error: 'Not Found',
          message: 'Song not found',
          code: 'LIBRARY_SONG_NOT_FOUND',
        });
      }
      return song;
    } catch (error) {
      throw toLibraryHttpException(error);
    }
  }

  @Get('songs/:songId')
  async getSong(@Param('songId', ParseUUIDPipe) songId: string) {
    try {
      return await this.getSongQuery.execute(songId);
    } catch (error) {
      throw toLibraryHttpException(error);
    }
  }

  @Get('themes')
  async listThemes(@Query() dto: ListThemesQueryDto) {
    try {
      return await this.listThemesQuery.execute(dto);
    } catch (error) {
      throw toLibraryHttpException(error);
    }
  }
}
