import { CollaboratorRole } from '../types/project';

export type RoleName = 'GESTOR' | 'COLABORADOR';

const MANAGER_ROLE: RoleName = 'GESTOR';

export const normalizeRoleName = (value?: string | null): RoleName => {
  const normalized = value?.toString().trim().toUpperCase();
  return normalized === MANAGER_ROLE ? MANAGER_ROLE : 'COLABORADOR';
};

export const isManagerRole = (value?: string | null): boolean => {
  return normalizeRoleName(value) === MANAGER_ROLE;
};

export const mapRoleNameToCollaboratorRole = (value?: string | null): CollaboratorRole => {
  return isManagerRole(value) ? 'Gestor de proyecto' : 'Colaborador';
};