import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { TaskProject } from '../../database/entities/task-project.entity';
import { Project } from '../../database/entities/project.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TaskProject, Project])],
  providers: [ReportsService],
  controllers: [ReportsController]
})
export class ReportsModule {}