import { apiClient, withAuthorization } from './apiClient';
import { mapTaskStatusDescription, getTaskStatusLabel } from '../utils/status';
import { TaskStatus } from '../types/project';

interface ApiCollaboratorTaskReport {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  tasks: Array<{
    taskId: string;
    description: string;
    state: string | { description?: string } | null;
    project: {
      id: string;
      name: string;
    };
  }>;
}

interface ApiOverAssignmentReport {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  tasks: Array<{
    taskId: string;
    description: string;
    state: string | { description?: string } | null;
    project: { id: string; name: string };
    startDate: string;
    endDate: string;
  }>;
}

interface ApiDelayedProjectReport {
  id: string;
  name: string;
  estimatedDate: string;
  delayDays: number;
  pendingTasks: number;
}

export interface CollaboratorTaskReportItem {
  collaborator: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  tasks: Array<{
    id: string;
    name: string;
    status: TaskStatus;
    statusLabel: string;
    project: { id: string; name: string };
  }>;
}

export interface OverAssignmentReportItem {
  collaborator: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  conflicts: Array<{
    id: string;
    name: string;
    status: TaskStatus;
    statusLabel: string;
    project: { id: string; name: string };
    startDate: string;
    endDate: string;
  }>;
}

export interface DelayedProjectReportItem {
  id: string;
  name: string;
  estimatedDate: string;
  delayDays: number;
  pendingTasks: number;
}

const mapCollaboratorTaskReport = (item: ApiCollaboratorTaskReport): CollaboratorTaskReportItem => ({
  collaborator: {
    id: item.employee.id,
    firstName: item.employee.firstName,
    lastName: item.employee.lastName,
    email: item.employee.email ?? ''
  },
  tasks: item.tasks.map((task) => {
    const status = mapTaskStatusDescription(task.state);
    return {
      id: task.taskId,
      name: task.description,
      status,
      statusLabel: getTaskStatusLabel(status),
      project: task.project
    };
  })
});

const mapOverAssignmentReport = (item: ApiOverAssignmentReport): OverAssignmentReportItem => ({
  collaborator: {
    id: item.employee.id,
    firstName: item.employee.firstName,
    lastName: item.employee.lastName,
    email: item.employee.email ?? ''
  },
  conflicts: item.tasks.map((task) => {
    const status = mapTaskStatusDescription(task.state);
    return {
      id: task.taskId,
      name: task.description,
      status,
      statusLabel: getTaskStatusLabel(status),
      project: task.project,
      startDate: task.startDate,
      endDate: task.endDate
    };
  })
});

const reportsService = {
  async getCollaboratorsWithMultipleTasks(token: string): Promise<CollaboratorTaskReportItem[]> {
    const { data } = await apiClient.get<ApiCollaboratorTaskReport[]>(
      '/reports/collaborators/multiple-tasks',
      withAuthorization(token)
    );
    return data.map(mapCollaboratorTaskReport);
  },
  async getOverAssignedCollaborators(token: string): Promise<OverAssignmentReportItem[]> {
    const { data } = await apiClient.get<ApiOverAssignmentReport[]>(
      '/reports/collaborators/over-assignment',
      withAuthorization(token)
    );
    return data.map(mapOverAssignmentReport);
  },
  async getDelayedProjects(token: string): Promise<DelayedProjectReportItem[]> {
    const { data } = await apiClient.get<ApiDelayedProjectReport[]>(
      '/reports/projects/delayed',
      withAuthorization(token)
    );
    return data;
  }
};

export default reportsService;