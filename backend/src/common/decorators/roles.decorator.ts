import { SetMetadata } from '@nestjs/common';
import { RoleName } from '../interfaces/authenticated-user.interface';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);