import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateCollaboratorDto } from './dto/create-collaborator.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post('collaborators')
  @Roles('GESTOR')
  createCollaborator(@Body() dto: CreateCollaboratorDto) {
    return this.employeesService.createCollaborator(dto);
  }

  @Get('collaborators')
  @Roles('GESTOR')
  findCollaborators() {
    return this.employeesService.findAllCollaborators();
  }
}