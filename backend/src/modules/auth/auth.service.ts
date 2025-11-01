import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../../database/entities/employee.entity';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeesRepository: Repository<Employee>,
    private readonly jwtService: JwtService
  ) {}

  async validateUser(email: string, password: string): Promise<AuthenticatedUser> {
    const employee = await this.employeesRepository
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.role', 'role')
      .addSelect('employee.passwordHash')
      .where('LOWER(employee.correo_electronico) = LOWER(:email)', { email })
      .getOne();

    if (!employee || !employee.passwordHash) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, employee.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return {
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      roleId: employee.role.id,
      roleName: employee.role.name as AuthenticatedUser['roleName'],
      email: employee.email
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    const payload = {
      sub: user.id,
      role: user.roleName,
      roleId: user.roleId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email
    };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      user
    };
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }
}