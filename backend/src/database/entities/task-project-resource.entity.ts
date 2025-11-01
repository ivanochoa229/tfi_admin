import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Task } from './task.entity';
import { Resource } from './resource.entity';
import { Project } from './project.entity';

@Entity({ name: 'tarea_proyecto_recurso' })
export class TaskProjectResource {
  @PrimaryGeneratedColumn('uuid', { name: 'id_tarea_proyecto_recurso' })
  id: string;

  @ManyToOne(() => Task, (task) => task.resourceAllocations, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_tarea' })
  task: Task;

  @ManyToOne(() => Resource, (resource) => resource.allocations, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_recurso' })
  resource: Resource;

  @ManyToOne(() => Project, (project) => project.resources, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_proyecto' })
  project: Project;

  @Column({ name: 'cantidad', type: 'int' })
  quantity: number;
}