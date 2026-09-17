import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../identity/interface/guards/jwt-auth.guard';
import {
  BookSummaryView,
  CreateBookUseCase,
  PlaceBookUseCase,
  RestoreBookUseCase,
  UpdateBookUseCase,
} from '../../../library';
import { ArchiveWithUsageCheck } from '../../application/archive-with-usage-check';
import {
  ArchiveBookQueryDto,
  CreateBookDto,
  PatchBookDto,
} from '../dto/admin-books.dto';
import { SuperAdminGuard } from '../guards/super-admin.guard';
import { toLibraryAdminHttpException } from '../http/library-admin-error-mapper';

@Controller('admin/library/books')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminBooksController {
  constructor(
    private readonly createBookUseCase: CreateBookUseCase,
    private readonly updateBookUseCase: UpdateBookUseCase,
    private readonly placeBookUseCase: PlaceBookUseCase,
    private readonly restoreBookUseCase: RestoreBookUseCase,
    private readonly archiveWithUsageCheck: ArchiveWithUsageCheck,
  ) {}

  @Post()
  async createBook(@Body() dto: CreateBookDto): Promise<BookSummaryView> {
    try {
      return await this.createBookUseCase.execute({
        title: dto.title,
        seriesId: dto.seriesId,
        volume: dto.volume,
      });
    } catch (error) {
      throw toLibraryAdminHttpException(error);
    }
  }

  @Patch(':bookId')
  async updateBook(
    @Param('bookId', ParseUUIDPipe) bookId: string,
    @Body() dto: PatchBookDto,
  ): Promise<void> {
    if (
      dto.title === undefined &&
      dto.seriesId === undefined &&
      dto.volume === undefined
    ) {
      throw new BadRequestException('At least one field must be provided');
    }

    try {
      if (dto.title !== undefined) {
        await this.updateBookUseCase.execute({
          id: bookId,
          title: dto.title,
        });
      }
      if (dto.seriesId !== undefined || dto.volume !== undefined) {
        await this.placeBookUseCase.execute({
          bookId,
          seriesId: dto.seriesId ?? null,
          volume: dto.volume ?? null,
        });
      }
    } catch (error) {
      throw toLibraryAdminHttpException(error);
    }
  }

  @Post(':bookId/archive')
  @HttpCode(HttpStatus.OK)
  async archiveBook(
    @Param('bookId', ParseUUIDPipe) bookId: string,
    @Query() query: ArchiveBookQueryDto,
  ): Promise<void> {
    try {
      await this.archiveWithUsageCheck.archiveBook(bookId, query.confirmInUse);
    } catch (error) {
      throw toLibraryAdminHttpException(error);
    }
  }

  @Post(':bookId/restore')
  @HttpCode(HttpStatus.OK)
  async restoreBook(
    @Param('bookId', ParseUUIDPipe) bookId: string,
  ): Promise<void> {
    try {
      await this.restoreBookUseCase.execute({ id: bookId });
    } catch (error) {
      throw toLibraryAdminHttpException(error);
    }
  }
}
