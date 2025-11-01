export type RoleName = 'GESTOR' | 'COLABORADOR';

export interface AuthenticatedUser {
  id: string;
  firstName: string;
  lastName: string;
  roleId: number;
  roleName: RoleName;
  email?: string;
}