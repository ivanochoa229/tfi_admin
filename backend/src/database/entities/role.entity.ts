import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { Employee } from './employee.entity';

@Entity({ name: 'rol' })
export class Role {
  @PrimaryColumn({ name: 'id_rol', type: 'int' })
  id: number;

  @Column({ name: 'nombre_rol', type: 'varchar', length: 45 })
  name: string;

  @OneToMany(() => Employee, (employee) => employee.role)
  employees: Employee[];
}