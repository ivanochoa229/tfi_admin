import { apiClient, withAuthorization } from './apiClient';
import { mapTaskStatusDescription, getTaskStatusLabel } from '../utils/status';
import { TaskStatus } from '../types/project';


interface ApiOverAssignmentReport {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  tasks: Array<{
    taskId: string;
    name: string;
    description?: string | null;
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
      name: task.name,
      status,
      statusLabel: getTaskStatusLabel(status),
      project: task.project,
      startDate: task.startDate,
      endDate: task.endDate
    };
  })
});

const reportsService = {
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