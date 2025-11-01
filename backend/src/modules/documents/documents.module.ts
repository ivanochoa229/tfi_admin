import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { Document } from '../../database/entities/document.entity';
import { Task } from '../../database/entities/task.entity';
import { TaskProject } from '../../database/entities/task-project.entity';
import { Employee } from '../../database/entities/employee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Document, Task, TaskProject, Employee])],
  providers: [DocumentsService],
  controllers: [DocumentsController]
})
export class DocumentsModule {}