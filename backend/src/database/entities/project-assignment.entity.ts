import { Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Employee } from './employee.entity';
import { Project } from './project.entity';

@Entity({ name: 'proyecto_empleado' })
export class ProjectAssignment {
  @PrimaryGeneratedColumn('increment', { name: 'id_proyecto_empleado', type: 'int' })
  id: number;

  @ManyToOne(() => Employee, (employee) => employee.projectAssignments, { eager: true })
  @JoinColumn({ name: 'id_empleado' })
  employee: Employee;

  @ManyToOne(() => Project, (project) => project.collaborators, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_proyecto' })
  project: Project;
}