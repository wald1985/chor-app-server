import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CommunityMemberGuard,
  CommunityPermission,
  JwtAuthGuard,
  RequirePermission,
} from '../../../identity';
import { ArchiveFolderUseCase } from '../../application/use-cases/folders/archive-folder.use-case';
import { CreateFolderUseCase } from '../../application/use-cases/folders/create-folder.use-case';
import { ListFoldersUseCase } from '../../application/use-cases/folders/list-folders.use-case';
import { RenameFolderUseCase } from '../../application/use-cases/folders/rename-folder.use-case';
import { CreateFolderDto, UpdateFolderDto } from '../http/dto/folders.dto';
import { toRepertoireHttpException } from '../http/repertoire-error-mapper';

@Controller('communities/:communityId/folders')
@UseGuards(JwtAuthGuard, CommunityMemberGuard)
export class CommunityFoldersController {
  constructor(
    private readonly listFoldersUseCase: ListFoldersUseCase,
    private readonly createFolderUseCase: CreateFolderUseCase,
    private readonly renameFolderUseCase: RenameFolderUseCase,
    private readonly archiveFolderUseCase: ArchiveFolderUseCase,
  ) {}

  @Get()
  async listFolders(@Param('communityId', ParseUUIDPipe) communityId: string) {
    try {
      const folders = await this.listFoldersUseCase.execute({ communityId });
      return folders.map((folder) => ({
        id: folder.id,
        communityId: folder.communityId,
        title: folder.titleValue,
        archived: folder.isArchived,
        archivedAt: folder.archivedAt,
        createdAt: folder.createdAt,
      }));
    } catch (error) {
      throw toRepertoireHttpException(error);
    }
  }

  @Post()
  @RequirePermission(CommunityPermission.REPERTOIRE_MANAGE)
  async createFolder(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Body() dto: CreateFolderDto,
  ) {
    try {
      const folder = await this.createFolderUseCase.execute({
        communityId,
        title: dto.title,
      });
      return {
        id: folder.id,
        communityId: folder.communityId,
        title: folder.titleValue,
        archived: folder.isArchived,
        archivedAt: folder.archivedAt,
        createdAt: folder.createdAt,
      };
    } catch (error) {
      throw toRepertoireHttpException(error);
    }
  }

  @Patch(':folderId')
  @RequirePermission(CommunityPermission.REPERTOIRE_MANAGE)
  async renameFolder(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Body() dto: UpdateFolderDto,
  ) {
    try {
      const folder = await this.renameFolderUseCase.execute({
        communityId,
        folderId,
        title: dto.title,
      });
      return {
        id: folder.id,
        communityId: folder.communityId,
        title: folder.titleValue,
        archived: folder.isArchived,
        archivedAt: folder.archivedAt,
        createdAt: folder.createdAt,
      };
    } catch (error) {
      throw toRepertoireHttpException(error);
    }
  }

  @Post(':folderId/archive')
  @RequirePermission(CommunityPermission.REPERTOIRE_MANAGE)
  async archiveFolder(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('folderId', ParseUUIDPipe) folderId: string,
  ) {
    try {
      await this.archiveFolderUseCase.execute({ communityId, folderId });
      return { success: true };
    } catch (error) {
      throw toRepertoireHttpException(error);
    }
  }
}
