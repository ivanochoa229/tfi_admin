import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Employee } from '../../database/entities/employee.entity';
import { Role } from '../../database/entities/role.entity';
import { CreateCollaboratorDto } from './dto/create-collaborator.dto';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeesRepository: Repository<Employee>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    private readonly authService: AuthService
  ) {}

  async createCollaborator(dto: CreateCollaboratorDto): Promise<Employee> {
    const existingEmployee = await this.employeesRepository.findOne({
      where: { email: ILike(dto.email) }
    });
    if (existingEmployee) {
      throw new BadRequestException('Ya existe un colaborador con ese correo electrónico');
    }

    const collaboratorRole = await this.rolesRepository.findOne({ where: { name: 'COLABORADOR' } });
    if (!collaboratorRole) {
      throw new NotFoundException('No se encontró el rol de colaborador, verifique la semilla de datos');
    }

    const passwordHash = await this.authService.hashPassword(dto.password);

    const collaborator = this.employeesRepository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email.toLowerCase(),
      phone: dto.phone,
      passwordHash,
      role: collaboratorRole
    });

    return this.employeesRepository.save(collaborator);
  }

  async findAllCollaborators(): Promise<Employee[]> {
    return this.employeesRepository.find({
      where: {
        role: { name: 'COLABORADOR' },
      },
      order: { firstName: 'ASC', lastName: 'ASC' }
    });
  }

  async findById(id: string): Promise<Employee> {
    const employee = await this.employeesRepository.findOne({ where: { id } });
    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }
    return employee;
  }
}