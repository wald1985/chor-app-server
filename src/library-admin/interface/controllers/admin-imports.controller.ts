import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApplyImportUseCase,
  ImportPlan,
  ImportPlanSummary,
  LibraryImportPlanChangedError,
  ParsedBook,
  PlanSongItem,
  PreviewImportUseCase,
} from '../../../library';
import { ArchiveWithUsageCheck } from '../../application/archive-with-usage-check';
import { LIBRARY_USAGE_PROVIDER } from '../../application/ports/library-usage-provider.port';
import type {
  LibraryItemUsage,
  LibraryUsageProvider,
} from '../../application/ports/library-usage-provider.port';
import { SuperadminAuthGuard } from '../../../superadmin';
import { ApplyImportDto } from '../dto/apply-import.dto';
import { AdminImportExceptionFilter } from '../http/admin-import-exception.filter';
import type {
  ImportBookPreviewView,
  ImportBookSongsView,
  ImportInUseView,
  ImportPreviewView,
  ImportResultView,
  ImportSummaryView,
  ImportThemesPreviewView,
} from '../views/import.views';

@Controller('admin/library/imports')
@UseGuards(SuperadminAuthGuard)
@UseFilters(AdminImportExceptionFilter)
export class AdminImportsController {
  private readonly logger = new Logger(AdminImportsController.name);

  constructor(
    private readonly previewImportUseCase: PreviewImportUseCase,
    private readonly applyImportUseCase: ApplyImportUseCase,
    private readonly archiveWithUsageCheck: ArchiveWithUsageCheck,
    @Inject(LIBRARY_USAGE_PROVIDER)
    private readonly usageProvider: LibraryUsageProvider,
  ) {}

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 5 },
    }),
  )
  async preview(
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ImportPreviewView> {
    const validFile = this.assertFile(file);
    const res = await this.previewImportUseCase.execute({
      buffer: validFile.buffer,
      filename: validFile.originalname,
    });

    const usages = await this.usageProvider.countUsage(res.plan.archivedRefs());
    const inUse = usages.filter((u) => u.communities > 0 || u.references > 0);

    this.logger.log(
      `Import preview: size=${validFile.size}, format=${res.format}, summary=${JSON.stringify(res.plan.summary())}`,
    );

    return this.buildPreviewView(
      res.plan,
      res.format,
      res.parsedFile.books,
      inUse,
    );
  }

  @Post('apply')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 5 },
    }),
  )
  async apply(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: ApplyImportDto,
  ): Promise<ImportResultView> {
    const validFile = this.assertFile(file);
    const confirm = dto.confirmInUse === true || dto.confirmInUse === 'true';

    const previewRes = await this.previewImportUseCase.execute({
      buffer: validFile.buffer,
      filename: validFile.originalname,
    });
    this.verifyPlanHash(previewRes.plan.hash(), dto.planHash);
    await this.archiveWithUsageCheck.checkImportArchivedUsage(
      previewRes.plan.archivedRefs(),
      confirm,
    );

    const applyRes = await this.applyImportUseCase.execute({
      buffer: validFile.buffer,
      filename: validFile.originalname,
      expectedPlanHash: dto.planHash,
    });

    this.logger.log(
      `Import applied: size=${validFile.size}, summary=${JSON.stringify(applyRes.summary)}`,
    );

    return {
      planHash: applyRes.planHash,
      summary: this.formatSummary(applyRes.summary),
    };
  }

  private assertFile(file?: Express.Multer.File): Express.Multer.File {
    if (!file || !file.buffer) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'No file uploaded',
        code: 'LIBRARY_FILE_INVALID',
        errors: [{ code: 'FILE_UNREADABLE', message: 'No file uploaded' }],
      });
    }
    return file;
  }

  private verifyPlanHash(actualHash: string, expectedHash: string): void {
    const normActual = actualHash.replace(/^sha256:/, '');
    const normExpected = expectedHash.replace(/^sha256:/, '');
    if (normActual !== normExpected) {
      throw new LibraryImportPlanChangedError(actualHash);
    }
  }

  private buildPreviewView(
    plan: ImportPlan,
    format: 'JSON' | 'CSV' | 'XLSX',
    parsedBooks: ParsedBook[],
    inUse: LibraryItemUsage[],
  ): ImportPreviewView {
    return {
      planHash: plan.hash(),
      format,
      summary: this.formatSummary(plan.summary()),
      books: this.buildBooksPreview(plan, parsedBooks),
      themes: this.buildThemesPreview(plan),
      inUse: this.buildInUseView(inUse),
      requiresConfirmation: inUse.length > 0,
    };
  }

  private formatSummary(s: ImportPlanSummary): ImportSummaryView {
    return {
      series: { create: s.seriesCreated, restore: s.seriesRestored },
      books: {
        create: s.booksCreated,
        place: s.booksPlaced,
        restore: s.booksRestored,
        unchanged: s.booksUnchanged,
      },
      themes: { create: s.themesCreated, restore: s.themesRestored },
      songs: {
        create: s.songsCreated,
        update: s.songsUpdated,
        move: s.songsMoved,
        restore: s.songsRestored,
        archive: s.songsArchived,
        unchanged: s.songsUnchanged,
      },
    };
  }

  private buildBooksPreview(
    plan: ImportPlan,
    parsedBooks: ParsedBook[],
  ): ImportBookPreviewView[] {
    const plannedBooksMap = new Map(plan.books.map((b) => [b.titleKey, b]));

    return parsedBooks.map((pb) => {
      const key = pb.title.trim().toLowerCase();
      const pBook = plannedBooksMap.get(key);
      const action = pBook ? pBook.action : 'UNCHANGED';
      const bId = pBook?.id ?? '';

      return {
        title: pb.title,
        action,
        series: pb.series,
        volume: pb.volume,
        songs: this.buildBookSongsPreview(plan.songs, bId),
      };
    });
  }

  private buildBookSongsPreview(
    allSongs: PlanSongItem[],
    bookId: string,
  ): ImportBookSongsView {
    const bookSongs = allSongs.filter(
      (s) => s.bookId === bookId || s.oldBookId === bookId,
    );

    const create: string[] = [];
    const update: Array<{ number: string; fields: string[] }> = [];
    const move: string[] = [];
    const restore: string[] = [];
    const archive: string[] = [];

    for (const s of bookSongs) {
      if (s.action === 'CREATE') create.push(s.number);
      else if (s.action === 'UPDATE') {
        update.push({ number: s.number, fields: s.changes ?? [] });
      } else if (s.action === 'MOVE') move.push(s.number);
      else if (s.action === 'RESTORE') restore.push(s.number);
      else if (s.action === 'ARCHIVE') archive.push(s.number);
    }

    return { create, update, move, restore, archive };
  }

  private buildThemesPreview(plan: ImportPlan): ImportThemesPreviewView {
    const create = plan.themes
      .filter((t) => t.action === 'CREATE')
      .map((t) => t.name);
    const restore = plan.themes
      .filter((t) => t.action === 'RESTORE')
      .map((t) => t.name);
    return { create, restore };
  }

  private buildInUseView(inUse: LibraryItemUsage[]): ImportInUseView[] {
    return inUse.map((u) => ({
      type: u.ref.type,
      id: u.ref.id,
      label: u.ref.id,
      communities: u.communities,
      references: u.references,
    }));
  }
}
