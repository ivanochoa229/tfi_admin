import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { Project } from '../../database/entities/project.entity';
import { Priority } from '../../database/entities/priority.entity';
import { Task } from '../../database/entities/task.entity';
import { TaskState } from '../../database/entities/task-state.entity';
import { TaskProject } from '../../database/entities/task-project.entity';
import { ProjectAssignment } from '../../database/entities/project-assignment.entity';
import { Employee } from '../../database/entities/employee.entity';
import { Resource } from '../../database/entities/resource.entity';
import { TaskProjectResource } from '../../database/entities/task-project-resource.entity';
import { TaskEvolution } from '../../database/entities/task-evolution.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      Priority,
      Task,
      TaskState,
      TaskProject,
      ProjectAssignment,
      Employee,
      Resource,
      TaskProjectResource,
      TaskEvolution
    ])
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService]
})
export class ProjectsModule {}