import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { LibraryModule } from '../library';
import { PrismaModule } from '../shared/prisma/prisma.module';
import {
  LookupCommunitySongQuery,
  SONG_LOOKUP,
} from './application/queries/lookup-community-song.query';
import { ArchiveAttachmentUseCase } from './application/use-cases/attachments/archive-attachment.use-case';
import { AttachBookUseCase } from './application/use-cases/attachments/attach-book.use-case';
import { DetachBookUseCase } from './application/use-cases/attachments/detach-book.use-case';
import { GetAttachmentsUseCase } from './application/use-cases/attachments/get-attachments.use-case';
import { ArchiveFolderSongUseCase } from './application/use-cases/folder-songs/archive-folder-song.use-case';
import { CreateFolderSongUseCase } from './application/use-cases/folder-songs/create-folder-song.use-case';
import { UpdateFolderSongUseCase } from './application/use-cases/folder-songs/update-folder-song.use-case';
import { ArchiveFolderUseCase } from './application/use-cases/folders/archive-folder.use-case';
import { CreateFolderUseCase } from './application/use-cases/folders/create-folder.use-case';
import { ListFoldersUseCase } from './application/use-cases/folders/list-folders.use-case';
import { RenameFolderUseCase } from './application/use-cases/folders/rename-folder.use-case';
import { GetCommunitySongsUseCase } from './application/use-cases/songs/get-community-songs.use-case';
import { CreateThemeUseCase } from './application/use-cases/themes/create-theme.use-case';
import { GetCommunityThemesUseCase } from './application/use-cases/themes/get-community-themes.use-case';
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
import { CommunityAttachmentsController } from './interface/controllers/community-attachments.controller';
import { CommunityFolderSongsController } from './interface/controllers/community-folder-songs.controller';
import { CommunityFoldersController } from './interface/controllers/community-folders.controller';
import { CommunitySongsController } from './interface/controllers/community-songs.controller';
import { CommunityThemesController } from './interface/controllers/community-themes.controller';

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
  GetCommunityThemesUseCase,
  AttachBookUseCase,
  ArchiveAttachmentUseCase,
  DetachBookUseCase,
  GetAttachmentsUseCase,
  GetCommunitySongsUseCase,
  LookupCommunitySongQuery,
];

@Module({
  imports: [PrismaModule, LibraryModule, IdentityModule],
  controllers: [
    CommunityAttachmentsController,
    CommunityFoldersController,
    CommunityFolderSongsController,
    CommunitySongsController,
    CommunityThemesController,
  ],
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
    {
      provide: SONG_LOOKUP,
      useClass: LookupCommunitySongQuery,
    },
  ],
  exports: [
    ...USE_CASES,
    FOLDER_REPOSITORY,
    FOLDER_SONG_REPOSITORY,
    BOOK_ATTACHMENT_REPOSITORY,
    THEME_REPOSITORY,
    SONG_THEME_ASSIGNMENT_REPOSITORY,
    SONG_LOOKUP,
  ],
})
export class RepertoireModule {}
