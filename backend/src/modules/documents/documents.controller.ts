import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('tasks/:taskId')
  upload(
    @Param('taskId') taskId: string,
    @Body() dto: UploadDocumentDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.documentsService.upload(taskId, dto, user);
  }

  @Get('tasks/:taskId')
  list(@Param('taskId') taskId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.list(taskId, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.remove(id, user);
  }
}