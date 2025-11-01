import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateProjectDto } from './dto/create-project.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CreateTaskDto } from './dto/create-task.dto';
import { AssignCollaboratorsDto } from './dto/assign-collaborators.dto';
import { AssignResourceDto } from './dto/assign-resource.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';

@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Roles('GESTOR')
  createProject(@Body() dto: CreateProjectDto) {
    return this.projectsService.createProject(dto);
  }

  @Get()
  findProjects(@CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.findAllForUser(user);
  }

  @Get('catalog/priorities')
  getPriorities() {
    return this.projectsService.getPriorities();
  }

  @Get('catalog/task-states')
  getTaskStates() {
    return this.projectsService.getTaskStates();
  }

  @Get('catalog/resources')
  getResources() {
    return this.projectsService.getResources();
  }

  @Get(':id')
  findProject(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.findProjectDetail(id, user);
  }

  @Get(':id/tasks')
  findTasks(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.getProjectTasks(id, user);
  }

  @Post(':id/tasks')
  @Roles('GESTOR')
  createTask(
    @Param('id') id: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.projectsService.createTask(id, dto, user);
  }

  @Post(':projectId/tasks/:taskId/collaborators')
  @Roles('GESTOR')
  assignCollaborators(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() dto: AssignCollaboratorsDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.projectsService.assignCollaborators(projectId, taskId, dto, user);
  }

  @Delete(':projectId/tasks/:taskId')
  @Roles('GESTOR')
  deleteTask(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.projectsService.removeTask(projectId, taskId, user);
  }

  @Post(':projectId/tasks/:taskId/resources')
  @Roles('GESTOR')
  assignResource(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() dto: AssignResourceDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.projectsService.assignResource(projectId, taskId, dto, user);
  }

  @Patch(':projectId/tasks/:taskId/status')
  updateTaskStatus(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskStatusDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.projectsService.updateTaskStatus(projectId, taskId, dto, user);
  }
}