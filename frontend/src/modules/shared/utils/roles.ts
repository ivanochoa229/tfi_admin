import { CollaboratorRole } from '../types/project';

export type RoleName = 'GESTOR' | 'COLABORADOR';

const MANAGER_ROLE: RoleName = 'GESTOR';

const MANAGER_KEYWORDS = ['GESTOR', 'MANAGER'];

export const normalizeRoleName = (value?: string | null): RoleName => {
  const normalized = value?.toString().trim().replace(/\s+/g, ' ').toUpperCase();
   if (!normalized) {
    return 'COLABORADOR';
  }

  const isManager =
    normalized === MANAGER_ROLE || MANAGER_KEYWORDS.some((keyword) => normalized.includes(keyword));

  return isManager ? MANAGER_ROLE : 'COLABORADOR';
};

export const isManagerRole = (value?: string | null): boolean => {
  return normalizeRoleName(value) === MANAGER_ROLE;
};

export const mapRoleNameToCollaboratorRole = (value?: string | null): CollaboratorRole => {
  return isManagerRole(value) ? 'Gestor de proyecto' : 'Colaborador';
};