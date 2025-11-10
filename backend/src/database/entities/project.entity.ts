import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Priority } from './priority.entity';
import { TaskProject } from './task-project.entity';
import { ProjectAssignment } from './project-assignment.entity';
import { TaskProjectResource } from './task-project-resource.entity';

@Entity({ name: 'proyecto' })
export class Project {
  @PrimaryGeneratedColumn('uuid', { name: 'id_proyecto' })
  id: string;

  @Column({ name: 'fecha_inicio', type: 'timestamptz' })
  startDate: Date;

  @Column({ name: 'fecha_estimada', type: 'timestamptz' })
  estimatedDate: Date;

  @Column({ name: 'fecha_fin', type: 'timestamptz', nullable: true })
  endDate?: Date | null;

  @Column({ name: 'nombre_proyecto', type: 'varchar', length: 80 })
  name: string;

  @Column({ name: 'descripcion_proyecto', type: 'varchar', length: 80, nullable: true })
  description?: string;

  @Column({ name: 'presupuesto_total', type: 'numeric', precision: 12, scale: 2 })
  budget: string;

  @ManyToOne(() => Priority, (priority) => priority.projects, { eager: true })
  @JoinColumn({ name: 'id_prioridad' })
  priority: Priority;

  @OneToMany(() => TaskProject, (taskProject) => taskProject.project, { cascade: true })
  taskAssignments: TaskProject[];

  @OneToMany(() => ProjectAssignment, (assignment) => assignment.project, { cascade: true })
  collaborators: ProjectAssignment[];

  @OneToMany(() => TaskProjectResource, (resource) => resource.project)
  resources: TaskProjectResource[];
}