import { Collaborator } from '../types/project';

export const getCollaboratorFullName = (collaborators: Collaborator[], collaboratorId: string) => {
  const collaborator = collaborators.find((item) => item.id === collaboratorId);
  if (!collaborator) {
    return 'Sin asignar';
  }

  return `${collaborator.firstName} ${collaborator.lastName}`;
};

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);

export const formatDateTime = (value?: string | null, fallback = 'Sin registro') => {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed.toLocaleString();
};

export const normalizeDateTimeInput = (value: string) => {
  if (!value) {
    return value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
};