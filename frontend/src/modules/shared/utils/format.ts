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