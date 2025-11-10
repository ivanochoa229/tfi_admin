import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Employee } from './employee.entity';
import { Task } from './task.entity';
import { TaskState } from './task-state.entity';

@Entity({ name: 'evolucion_tarea' })
export class TaskEvolution {
  @PrimaryGeneratedColumn('uuid', { name: 'id_cambio' })
  id: string;

  @ManyToOne(() => Employee, (employee) => employee.taskEvolutions, { eager: true, nullable: true })
  @JoinColumn({ name: 'id_empleado' })
  employee?: Employee | null;

  @ManyToOne(() => Task, (task) => task.evolutions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_tarea' })
  task: Task;

  @ManyToOne(() => TaskState, (state) => state.evolutions, { eager: true })
  @JoinColumn({ name: 'id_estado_tarea' })
  state: TaskState;

  @Column({ name: 'fecha_inicio', type: 'timestamptz' })
  startDate: Date;

  @Column({ name: 'fecha_fin', type: 'timestamptz', nullable: true })
  endDate?: Date | null;

  @Column({ name: 'descripcion_cambio', type: 'varchar', length: 255, nullable: true })
  description?: string;
}