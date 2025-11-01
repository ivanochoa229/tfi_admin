import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Task } from './task.entity';
import { TaskEvolution } from './task-evolution.entity';

@Entity({ name: 'estado_tarea' })
export class TaskState {
  @PrimaryGeneratedColumn('uuid', { name: 'id_estado' })
  id: string;

  @Column({ name: 'descripcion_estado', type: 'varchar', length: 20 })
  description: string;

  @OneToMany(() => Task, (task) => task.state)
  tasks: Task[];

  @OneToMany(() => TaskEvolution, (evolution) => evolution.state)
  evolutions: TaskEvolution[];
}