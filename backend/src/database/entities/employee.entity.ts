import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn
} from 'typeorm';
import { Role } from './role.entity';
import { ProjectAssignment } from './project-assignment.entity';
import { TaskProject } from './task-project.entity';
import { TaskEvolution } from './task-evolution.entity';
import { Document } from './document.entity';

@Entity({ name: 'empleado' })
export class Employee {
  @PrimaryGeneratedColumn('uuid', { name: 'id_empleado' })
  id: string;

  @Column({ name: 'nombre_empleado', type: 'varchar', length: 80 })
  firstName: string;

  @Column({ name: 'apellido_empleado', type: 'varchar', length: 80 })
  lastName: string;

  @Column({ name: 'correo_electronico', type: 'varchar', length: 120, nullable: true })
  email?: string;

  @Column({ name: 'telefono', type: 'varchar', length: 30, nullable: true })
  phone?: string;

  @Column({ name: 'password', type: 'varchar', length: 120, nullable: true, select: false })
  passwordHash?: string;

  @ManyToOne(() => Role, (role) => role.employees, { eager: true })
  @JoinColumn({ name: 'id_rol' })
  role: Role;

  @OneToMany(() => ProjectAssignment, (assignment) => assignment.employee)
  projectAssignments: ProjectAssignment[];

  @OneToMany(() => TaskProject, (taskProject) => taskProject.employee)
  taskAssignments: TaskProject[];

  @OneToMany(() => TaskEvolution, (evolution) => evolution.employee)
  taskEvolutions: TaskEvolution[];

  @OneToMany(() => Document, (document) => document.uploadedBy)
  uploadedDocuments: Document[];
}