import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GESTOR')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('collaborators/multiple-tasks')
  getCollaborators() {
    return this.reportsService.getCollaboratorsWithMultipleTasks();
  }

  @Get('collaborators/over-assignment')
  getOverAssignedCollaborators() {
    return this.reportsService.getOverAssignedCollaborators();
  }

  @Get('projects/delayed')
  getDelayedProjects() {
    return this.reportsService.getDelayedProjects();
  }

  @Get('projects/:projectId/progress')
  getProjectProgress(@Param('projectId') projectId: string) {
    return this.reportsService.getProjectProgress(projectId);
  }
}