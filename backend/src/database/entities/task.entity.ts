import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { TaskState } from './task-state.entity';
import { Priority } from './priority.entity';
import { TaskProject } from './task-project.entity';
import { TaskEvolution } from './task-evolution.entity';
import { Document } from './document.entity';
import { TaskProjectResource } from './task-project-resource.entity';

@Entity({ name: 'tarea' })
export class Task {
  @PrimaryGeneratedColumn('uuid', { name: 'id_tarea' })
  id: string;

  @Column({ name: 'nombre_tarea', type: 'varchar', length: 50 })
  name: string;

  @Column({ name: 'descripcion_tarea', type: 'text', nullable: true })
  description?: string;

  @ManyToOne(() => TaskState, (state) => state.tasks, { eager: true })
  @JoinColumn({ name: 'id_estado' })
  state: TaskState;

  @ManyToOne(() => Priority, (priority) => priority.tasks, { eager: true })
  @JoinColumn({ name: 'id_prioridad' })
  priority: Priority;

  @Column({ name: 'fecha_inicio', type: 'timestamptz', nullable: true })
  startDate?: Date | null;

  @Column({ name: 'fecha_estimada', type: 'timestamptz', nullable: true })
  estimatedDate?: Date | null;

  @Column({ name: 'fecha_fin', type: 'timestamptz', nullable: true })
  endDate?: Date | null;

  @OneToMany(() => TaskProject, (taskProject) => taskProject.task)
  projectAssignments: TaskProject[];

  @OneToMany(() => TaskEvolution, (evolution) => evolution.task)
  evolutions: TaskEvolution[];

  @OneToMany(() => Document, (document) => document.task)
  documents: Document[];

  @OneToMany(() => TaskProjectResource, (resource) => resource.task)
  resourceAllocations: TaskProjectResource[];
}