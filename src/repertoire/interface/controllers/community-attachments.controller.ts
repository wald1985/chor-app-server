import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CommunityMemberGuard,
  CommunityPermission,
  JwtAuthGuard,
  RequirePermission,
} from '../../../identity';
import { ArchiveAttachmentUseCase } from '../../application/use-cases/attachments/archive-attachment.use-case';
import { AttachBookUseCase } from '../../application/use-cases/attachments/attach-book.use-case';
import { DetachBookUseCase } from '../../application/use-cases/attachments/detach-book.use-case';
import { GetAttachmentsUseCase } from '../../application/use-cases/attachments/get-attachments.use-case';
import { CreateAttachmentDto } from '../http/dto/attachments.dto';
import { toRepertoireHttpException } from '../http/repertoire-error-mapper';

@Controller('communities/:communityId/attachments')
@UseGuards(JwtAuthGuard, CommunityMemberGuard)
export class CommunityAttachmentsController {
  constructor(
    private readonly getAttachmentsUseCase: GetAttachmentsUseCase,
    private readonly attachBookUseCase: AttachBookUseCase,
    private readonly detachBookUseCase: DetachBookUseCase,
    private readonly archiveAttachmentUseCase: ArchiveAttachmentUseCase,
  ) {}

  @Get()
  async getAttachments(
    @Param('communityId', ParseUUIDPipe) communityId: string,
  ) {
    try {
      return await this.getAttachmentsUseCase.execute({ communityId });
    } catch (error) {
      throw toRepertoireHttpException(error);
    }
  }

  @Post()
  @RequirePermission(CommunityPermission.REPERTOIRE_MANAGE)
  async attachBook(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Body() dto: CreateAttachmentDto,
  ) {
    try {
      const attachment = await this.attachBookUseCase.execute({
        communityId,
        libraryBookId: dto.libraryBookId,
      });
      return {
        id: attachment.id,
        communityId: attachment.communityId,
        libraryBookId: attachment.libraryBookId,
        archived: attachment.isArchived,
        archivedAt: attachment.archivedAt,
        createdAt: attachment.createdAt,
      };
    } catch (error) {
      throw toRepertoireHttpException(error);
    }
  }

  @Delete(':attachmentId')
  @RequirePermission(CommunityPermission.REPERTOIRE_MANAGE)
  async detachBook(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ) {
    try {
      await this.detachBookUseCase.execute({ communityId, attachmentId });
      return { success: true };
    } catch (error) {
      throw toRepertoireHttpException(error);
    }
  }

  @Post(':attachmentId/archive')
  @RequirePermission(CommunityPermission.REPERTOIRE_MANAGE)
  async archiveAttachment(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ) {
    try {
      await this.archiveAttachmentUseCase.execute({
        communityId,
        attachmentId,
      });
      return { success: true };
    } catch (error) {
      throw toRepertoireHttpException(error);
    }
  }
}
