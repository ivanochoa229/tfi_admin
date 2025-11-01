import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { TaskProject } from './task-project.entity';
import { TaskProjectResource } from './task-project-resource.entity';

@Entity({ name: 'recurso' })
export class Resource {
  @PrimaryGeneratedColumn('uuid', { name: 'id_recurso' })
  id: string;

  @Column({ name: 'descripcion_recurso', type: 'varchar', length: 30 })
  description: string;

  @Column({ name: 'costo_unitario', type: 'numeric', precision: 12, scale: 2 })
  unitCost: string;

  @OneToMany(() => TaskProject, (taskProject) => taskProject.resource)
  taskAssignments: TaskProject[];

  @OneToMany(() => TaskProjectResource, (allocation) => allocation.resource)
  allocations: TaskProjectResource[];
}