import { Module } from '@nestjs/common';
import { PrismaModule } from '../shared/prisma/prisma.module';
import { ArchiveFolderSongUseCase } from './application/use-cases/folder-songs/archive-folder-song.use-case';
import { CreateFolderSongUseCase } from './application/use-cases/folder-songs/create-folder-song.use-case';
import { UpdateFolderSongUseCase } from './application/use-cases/folder-songs/update-folder-song.use-case';
import { ArchiveFolderUseCase } from './application/use-cases/folders/archive-folder.use-case';
import { CreateFolderUseCase } from './application/use-cases/folders/create-folder.use-case';
import { ListFoldersUseCase } from './application/use-cases/folders/list-folders.use-case';
import { RenameFolderUseCase } from './application/use-cases/folders/rename-folder.use-case';
import { CreateThemeUseCase } from './application/use-cases/themes/create-theme.use-case';
import { SetSongThemesUseCase } from './application/use-cases/themes/set-song-themes.use-case';
import { BOOK_ATTACHMENT_REPOSITORY } from './domain/ports/book-attachment-repository.port';
import { FOLDER_REPOSITORY } from './domain/ports/folder-repository.port';
import { FOLDER_SONG_REPOSITORY } from './domain/ports/folder-song-repository.port';
import { SONG_THEME_ASSIGNMENT_REPOSITORY } from './domain/ports/song-theme-assignment-repository.port';
import { THEME_REPOSITORY } from './domain/ports/theme-repository.port';
import { PrismaBookAttachmentRepository } from './infrastructure/prisma/prisma-book-attachment.repository';
import { PrismaFolderRepository } from './infrastructure/prisma/prisma-folder.repository';
import { PrismaFolderSongRepository } from './infrastructure/prisma/prisma-folder-song.repository';
import { PrismaSongThemeAssignmentRepository } from './infrastructure/prisma/prisma-song-theme-assignment.repository';
import { PrismaThemeRepository } from './infrastructure/prisma/prisma-theme.repository';

const USE_CASES = [
  CreateFolderUseCase,
  RenameFolderUseCase,
  ArchiveFolderUseCase,
  ListFoldersUseCase,
  CreateFolderSongUseCase,
  UpdateFolderSongUseCase,
  ArchiveFolderSongUseCase,
  CreateThemeUseCase,
  SetSongThemesUseCase,
];

@Module({
  imports: [PrismaModule],
  controllers: [],
  providers: [
    ...USE_CASES,
    {
      provide: FOLDER_REPOSITORY,
      useClass: PrismaFolderRepository,
    },
    {
      provide: FOLDER_SONG_REPOSITORY,
      useClass: PrismaFolderSongRepository,
    },
    {
      provide: BOOK_ATTACHMENT_REPOSITORY,
      useClass: PrismaBookAttachmentRepository,
    },
    {
      provide: THEME_REPOSITORY,
      useClass: PrismaThemeRepository,
    },
    {
      provide: SONG_THEME_ASSIGNMENT_REPOSITORY,
      useClass: PrismaSongThemeAssignmentRepository,
    },
  ],
  exports: [
    ...USE_CASES,
    FOLDER_REPOSITORY,
    FOLDER_SONG_REPOSITORY,
    BOOK_ATTACHMENT_REPOSITORY,
    THEME_REPOSITORY,
    SONG_THEME_ASSIGNMENT_REPOSITORY,
  ],
})
export class RepertoireModule {}
