import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { Employee } from '../../database/entities/employee.entity';
import { Role } from '../../database/entities/role.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Employee, Role]), AuthModule],
  providers: [EmployeesService],
  controllers: [EmployeesController],
  exports: [EmployeesService]
})
export class EmployeesModule {}