export enum ProjectStatus {
  Planned = 'PLANNED',
  InProgress = 'IN_PROGRESS',
  Completed = 'COMPLETED',
  OnHold = 'ON_HOLD'
}

export enum PriorityLevel {
  Low = 'LOW',
  Medium = 'MEDIUM',
  High = 'HIGH'
}

export enum TaskStatus {
  Pending = 'PENDING',
  InProgress = 'IN_PROGRESS',
  InReview = 'IN_REVIEW',
  Completed = 'COMPLETED'
}

export type CollaboratorRole = 'Gestor de proyecto' | 'Colaborador';

export interface Collaborator {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: CollaboratorRole;
}

export interface Resource {
  id: string;
  name: string;
  type: string;
  cost: number;
  description: string;
}

export interface ResourceAssignment {
  id: string;
  resourceId: string;
  name: string;
  quantity: number;
  unitCost: number;
  cost: number;
  assignedAt: string;
}

export interface TaskDocument {
  id: string;
  name: string;
  uploadedAt: string;
}

export interface TaskProgressNote {
  id: string;
  message: string;
  createdAt: string;
}

export interface Task {
  id: string;
  name: string;
  priority: PriorityLevel;
  startDate: string;
  dueDate: string;
  status: TaskStatus;
  description?: string;
  assigneeIds: string[];
  documentation: TaskDocument[];
  resources: ResourceAssignment[];
  progressNotes: TaskProgressNote[];
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  startDate: string;
  endDate: string;
  managerId: string;
  teamIds: string[];
  teamMembers?: Collaborator[];
  budget: number;
  usedBudget: number;
  priority: PriorityLevel;
  tasks: Task[];
}