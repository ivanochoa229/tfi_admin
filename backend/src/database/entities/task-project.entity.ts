import { Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Project } from './project.entity';
import { Task } from './task.entity';
import { Employee } from './employee.entity';
import { Resource } from './resource.entity';

@Entity({ name: 'tarea_proyecto' })
export class TaskProject {
  @PrimaryGeneratedColumn('uuid', { name: 'id_tarea_proyecto' })
  id: string;

  @ManyToOne(() => Project, (project) => project.taskAssignments, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_proyecto' })
  project: Project;

  @ManyToOne(() => Task, (task) => task.projectAssignments, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_tarea' })
  task: Task;

  @ManyToOne(() => Employee, (employee) => employee.taskAssignments, { eager: true, nullable: true })
  @JoinColumn({ name: 'id_empleado' })
  employee?: Employee | null;

  @ManyToOne(() => Resource, (resource) => resource.taskAssignments, { eager: true, nullable: true })
  @JoinColumn({ name: 'id_recurso' })
  resource?: Resource | null;
}