import { PriorityLevel, TaskStatus } from '../types/project';

const PRIORITY_DESCRIPTION_TO_LEVEL: Record<string, PriorityLevel> = {
  ALTA: PriorityLevel.High,
  MEDIA: PriorityLevel.Medium,
  BAJA: PriorityLevel.Low
};

const TASK_STATUS_DESCRIPTION_TO_STATUS: Record<string, TaskStatus> = {
  CREADA: TaskStatus.Pending,
  PENDIENTE: TaskStatus.Pending,
  'EN CURSO': TaskStatus.InProgress,
  'EN REVISION': TaskStatus.InReview,
  'EN REVISIÓN': TaskStatus.InReview,
  COMPLETADA: TaskStatus.Completed
};

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.Pending]: 'Pendiente',
  [TaskStatus.InProgress]: 'En curso',
  [TaskStatus.InReview]: 'En revisión',
  [TaskStatus.Completed]: 'Completada'
};

const normalizeDescription = (input: unknown): string | undefined => {
  if (typeof input === 'string') {
    return input.trim().toUpperCase();
  }

  if (input && typeof input === 'object' && 'description' in input) {
    const value = (input as { description?: unknown }).description;
    if (typeof value === 'string') {
      return value.trim().toUpperCase();
    }
  }

  return undefined;
};

export const mapPriorityDescription = (description: unknown): PriorityLevel => {
  const normalized = normalizeDescription(description);
  return normalized ? PRIORITY_DESCRIPTION_TO_LEVEL[normalized] ?? PriorityLevel.Medium : PriorityLevel.Medium;
};

export const mapTaskStatusDescription = (description: unknown): TaskStatus => {
  const normalized = normalizeDescription(description);
  return normalized ? TASK_STATUS_DESCRIPTION_TO_STATUS[normalized] ?? TaskStatus.Pending : TaskStatus.Pending;
};

export const getTaskStatusLabel = (status: TaskStatus): string => TASK_STATUS_LABELS[status];