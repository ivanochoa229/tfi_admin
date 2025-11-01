import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Task } from './task.entity';
import { Project } from './project.entity';

@Entity({ name: 'prioridad' })
export class Priority {
  @PrimaryGeneratedColumn('uuid', { name: 'id_prioridad' })
  id: string;

  @Column({ name: 'descripcion_prioridad', type: 'varchar', length: 20 })
  description: string;

  @OneToMany(() => Task, (task) => task.priority)
  tasks: Task[];

  @OneToMany(() => Project, (project) => project.priority)
  projects: Project[];
}