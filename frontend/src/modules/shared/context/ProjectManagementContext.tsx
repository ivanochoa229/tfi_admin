import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { isAxiosError } from 'axios';

import { useAuth } from '../../auth/AuthContext';
import { apiClient, withAuthorization } from '../services/apiClient';
import {
  Collaborator,
  CollaboratorRole,
  PriorityLevel,
  Project,
  ProjectStatus,
  Resource,
  ResourceAssignment,
  Task,
  TaskDocument,
  TaskProgressNote,
  TaskStatus
} from '../types/project';
import { mapPriorityDescription, mapTaskStatusDescription } from '../utils/status';

export interface CreateProjectPayload {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  budget: number;
  priority: PriorityLevel;
}

export interface CreateTaskPayload {
  name: string;
  priority: PriorityLevel;
  startDate: string;
  dueDate: string;
  description?: string;
}

export interface RegisterCollaboratorPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: CollaboratorRole;
}

interface ProjectManagementContextValue {
  projects: Project[];
  collaborators: Collaborator[];
  resources: Resource[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  loadProject: (projectId: string) => Promise<Project | undefined>;
  createProject: (payload: CreateProjectPayload) => Promise<Project>;
  createTask: (projectId: string, payload: CreateTaskPayload) => Promise<Task>;
  deleteTask: (projectId: string, taskId: string) => Promise<void>;
  setTaskCollaborators: (projectId: string, taskId: string, collaboratorIds: string[]) => Promise<void>;
  assignResourceToTask: (
    projectId: string,
    taskId: string,
    resourceId: string,
    quantity: number
  ) => Promise<ResourceAssignment>;
  removeResourceFromTask: (projectId: string, taskId: string, assignmentId: string) => Promise<void>;
  addDocumentationToTask: (projectId: string, taskId: string, files: File[]) => Promise<TaskDocument[]>;
  removeDocumentationFromTask: (projectId: string, taskId: string, documentId: string) => Promise<void>;
  updateTaskStatus: (
    projectId: string,
    taskId: string,
    status: TaskStatus,
    note: string
  ) => Promise<void>;
  registerCollaborator: (payload: RegisterCollaboratorPayload) => Promise<Collaborator>;
}

const ProjectManagementContext = createContext<ProjectManagementContextValue | undefined>(undefined);

type RawRole = 'GESTOR' | 'COLABORADOR';

type ApiPriority = { id: string; description: string };
type ApiTaskState = { id: string; description: string };
interface ApiRole {
  id: number;
  name: RawRole;
}
interface ApiEmployee {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role: ApiRole | null;
}
interface ApiTask {
  id: string;
  description: string;
  state?: { id: string; description: string } | null;
  priority?: { id: string; description: string } | null;
  startDate?: string | null;
  estimatedDate?: string | null;
  endDate?: string | null;
  documents?: ApiDocument[];
  evolutions?: ApiTaskEvolution[];
}
interface ApiTaskAssignment {
  id: string;
  task: ApiTask;
  employee?: ApiEmployee | null;
}
interface ApiTaskProjectResource {
  id: string;
  task: ApiTask;
  resource: ApiResource;
  quantity: number;
}
interface ApiProjectAssignment {
  id: number;
  employee: ApiEmployee;
}
interface ApiResource {
  id: string;
  description: string;
  unitCost: string;
}
interface ApiDocument {
  id: string;
  fileName: string;
  uploadedAt: string;
}
interface ApiTaskEvolution {
  id: string;
  description?: string;
  startDate: string;
}
interface ApiProject {
  id: string;
  name: string;
  description?: string | null;
  startDate: string;
  estimatedDate: string;
  endDate?: string | null;
  budget: string;
  priority: ApiPriority;
  taskAssignments?: ApiTaskAssignment[];
  collaborators?: ApiProjectAssignment[];
  resources?: ApiTaskProjectResource[];
}

const extractApiErrorMessage = (error: unknown, fallback: string) => {
  if (isAxiosError(error)) {
    const message = (error.response?.data as { message?: string | string[] } | undefined)?.message;
    if (Array.isArray(message)) {
      return message.join(' ');
    }
    if (typeof message === 'string') {
      return message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

const createEmptyPriorityMap = (): Record<PriorityLevel, string> => ({
  [PriorityLevel.Low]: '',
  [PriorityLevel.Medium]: '',
  [PriorityLevel.High]: ''
});

const createEmptyTaskStateMap = (): Record<TaskStatus, string> => ({
  [TaskStatus.Pending]: '',
  [TaskStatus.InProgress]: '',
  [TaskStatus.InReview]: '',
  [TaskStatus.Completed]: ''
});

const mapEmployeeToCollaborator = (employee: ApiEmployee): Collaborator => {
  const roleName = employee.role?.name ?? 'COLABORADOR';

  return {
    id: employee.id,
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email ?? '',
    phone: employee.phone ?? '',
    role: roleName === 'GESTOR' ? 'Gestor de proyecto' : 'Colaborador'
  };
};

const mergeCollaborators = (projects: Project[], additional: Collaborator[]): Collaborator[] => {
  const registry = new Map<string, Collaborator>();

  projects.forEach((project) => {
    project.teamMembers?.forEach((member) => {
      registry.set(member.id, member);
    });
  });

  additional.forEach((collaborator) => {
    registry.set(collaborator.id, collaborator);
  });

  return Array.from(registry.values()).sort((a, b) => {
    const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
    const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
    return nameA.localeCompare(nameB);
  });
};

const mapApiResourceToResource = (resource: ApiResource): Resource => ({
  id: resource.id,
  name: resource.description,
  type: 'Recurso',
  cost: Number(resource.unitCost),
  description: resource.description
});

const mapApiProjectToProject = (apiProject: ApiProject): Project => {
  const collaboratorCache = new Map<string, Collaborator>();
  const tasksMap = new Map<string, Task>();

  const assignments = apiProject.taskAssignments ?? [];
  assignments.forEach((assignment) => {
    const { task, employee } = assignment;
    const existing = tasksMap.get(task.id);
    const assigneeIds = existing?.assigneeIds ?? [];

    if (employee) {
      assigneeIds.push(employee.id);
      const collaborator = mapEmployeeToCollaborator(employee);
      collaboratorCache.set(collaborator.id, collaborator);
    }

    const mappedTask: Task = existing ?? {
      id: task.id,
      name: task.description,
      priority: mapPriorityDescription(task.priority),
      startDate: task.startDate ?? apiProject.startDate,
      dueDate: task.estimatedDate ?? apiProject.estimatedDate,
      status: mapTaskStatusDescription(task.state),
      description: '',
      assigneeIds: [],
      documentation: (task.documents ?? []).map((document) => ({
        id: document.id,
        name: document.fileName,
        uploadedAt: document.uploadedAt
      })),
      resources: [],
      progressNotes: (task.evolutions ?? []).map<TaskProgressNote>((evolution) => ({
        id: evolution.id,
        message: evolution.description ?? 'Actualización registrada',
        createdAt: evolution.startDate
      })),
      createdAt: task.startDate ?? apiProject.startDate
    };

    mappedTask.assigneeIds = Array.from(new Set([...mappedTask.assigneeIds, ...assigneeIds]));
    tasksMap.set(task.id, mappedTask);
  });

  const projectResources = apiProject.resources ?? [];
  projectResources.forEach((allocation) => {
    const existingTask = tasksMap.get(allocation.task.id);
    if (!existingTask) {
      const newTask: Task = {
        id: allocation.task.id,
        name: allocation.task.description,
        priority: mapPriorityDescription(allocation.task.priority),
        startDate: allocation.task.startDate ?? apiProject.startDate,
        dueDate: allocation.task.estimatedDate ?? apiProject.estimatedDate,
        status: mapTaskStatusDescription(allocation.task.state),
        description: '',
        assigneeIds: [],
        documentation: [],
        resources: [],
        progressNotes: [],
        createdAt: allocation.task.startDate ?? apiProject.startDate
      };
      tasksMap.set(allocation.task.id, newTask);
    }

    const unitCost = Number(allocation.resource.unitCost);
    const resourceAssignment: ResourceAssignment = {
      id: allocation.id,
      resourceId: allocation.resource.id,
      name: allocation.resource.description,
      quantity: allocation.quantity,
      unitCost,
      cost: unitCost * allocation.quantity,
      assignedAt: allocation.task.startDate ?? apiProject.startDate
    };

    const task = tasksMap.get(allocation.task.id);
    if (task && !task.resources.find((item) => item.id === resourceAssignment.id)) {
      task.resources = [...task.resources, resourceAssignment];
    }
  });

  const tasks = Array.from(tasksMap.values());
  const completedTasks = tasks.filter((task) => task.status === TaskStatus.Completed).length;
  const progress = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const projectAssignments = apiProject.collaborators ?? [];
  const teamIds = new Set<string>();
  projectAssignments.forEach((assignment) => {
    const collaborator = mapEmployeeToCollaborator(assignment.employee);
    collaboratorCache.set(collaborator.id, collaborator);
    teamIds.add(collaborator.id);
  });
  tasks.forEach((task) => task.assigneeIds.forEach((id) => teamIds.add(id)));

  const manager = Array.from(collaboratorCache.values()).find((item) => item.role === 'Gestor de proyecto');

  return {
    id: apiProject.id,
    name: apiProject.name,
    description: apiProject.description ?? '',
    status:
      progress === 100 && tasks.length > 0
        ? ProjectStatus.Completed
        : tasks.length > 0
        ? ProjectStatus.InProgress
        : ProjectStatus.Planned,
    progress,
    startDate: apiProject.startDate,
    endDate: apiProject.endDate ?? apiProject.estimatedDate,
    managerId: manager?.id ?? '',
    teamIds: Array.from(teamIds),
    teamMembers: Array.from(collaboratorCache.values()),
    budget: Number(apiProject.budget),
    usedBudget: tasks.reduce(
      (acc, task) => acc + task.resources.reduce((resourceAcc, resource) => resourceAcc + resource.cost, 0),
      0
    ),
    priority: apiProject.priority
      ? mapPriorityDescription(apiProject.priority.description)
      : PriorityLevel.Medium,
      tasks
  };
};

const createPriorityMap = (priorities: ApiPriority[]): Record<PriorityLevel, string> => {
  const map: Partial<Record<PriorityLevel, string>> = {};
  priorities.forEach((priority) => {
    const level = mapPriorityDescription(priority);
    map[level] = priority.id;
  });
  return {
    [PriorityLevel.Low]: map[PriorityLevel.Low] ?? '',
    [PriorityLevel.Medium]: map[PriorityLevel.Medium] ?? '',
    [PriorityLevel.High]: map[PriorityLevel.High] ?? ''
  };
};

const createTaskStateMap = (states: ApiTaskState[]): Record<TaskStatus, string> => {
  const map: Partial<Record<TaskStatus, string>> = {};
  states.forEach((state) => {
    const status = mapTaskStatusDescription(state);
    map[status] = state.id;
  });
  return {
    [TaskStatus.Pending]: map[TaskStatus.Pending] ?? '',
    [TaskStatus.InProgress]: map[TaskStatus.InProgress] ?? '',
    [TaskStatus.InReview]: map[TaskStatus.InReview] ?? '',
    [TaskStatus.Completed]: map[TaskStatus.Completed] ?? ''
  };
};

export const ProjectManagementProvider = ({ children }: { children: ReactNode }) => {
  const { token, user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [priorityIdMap, setPriorityIdMap] = useState<Record<PriorityLevel, string>>(createEmptyPriorityMap);
  const [taskStateIdMap, setTaskStateIdMap] = useState<Record<TaskStatus, string>>(createEmptyTaskStateMap);
  const [externalCollaborators, setExternalCollaborators] = useState<Collaborator[]>([]);
  const [resourceCatalog, setResourceCatalog] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const collaborators = useMemo(
    () => mergeCollaborators(projects, externalCollaborators),
    [projects, externalCollaborators]
  );

  const resources = useMemo(() => resourceCatalog, [resourceCatalog]);

  const loadProject = useCallback(
    async (projectId: string) => {
      if (!token) {
        return undefined;
      }

      const { data } = await apiClient.get<ApiProject>(
        `/projects/${projectId}`,
        withAuthorization(token)
      );

      const mapped = mapApiProjectToProject(data);
      setProjects((prev) => {
        const index = prev.findIndex((project) => project.id === projectId);
        if (index === -1) {
          return [...prev, mapped];
        }
        const next = [...prev];
        next[index] = mapped;
        return next;
      });
      return mapped;
    },
    [token]
  );

  const resetState = useCallback(() => {
    setProjects([]);
    setExternalCollaborators([]);
    setResourceCatalog([]);
    setPriorityIdMap(createEmptyPriorityMap());
    setTaskStateIdMap(createEmptyTaskStateMap());
    setError(null);
    setIsLoading(false);
  }, []);

  const loadInitialData = useCallback(async () => {
    if (!token) {
      resetState();
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [prioritiesResult, taskStatesResult, resourcesResult, projectsResult] =
        await Promise.allSettled([
          apiClient.get<ApiPriority[]>(`/projects/catalog/priorities`, withAuthorization(token)),
          apiClient.get<ApiTaskState[]>(`/projects/catalog/task-states`, withAuthorization(token)),
          apiClient.get<ApiResource[]>(`/projects/catalog/resources`, withAuthorization(token)),
          apiClient.get<ApiProject[]>(`/projects`, withAuthorization(token))
        ]);

      const encounteredErrors: string[] = [];

      if (prioritiesResult.status === 'fulfilled') {
        setPriorityIdMap(createPriorityMap(prioritiesResult.value.data));
      } else {
        console.error(prioritiesResult.reason);
        setPriorityIdMap(createEmptyPriorityMap());
        encounteredErrors.push('No se pudieron cargar las prioridades desde el backend.');
      }

      if (taskStatesResult.status === 'fulfilled') {
        setTaskStateIdMap(createTaskStateMap(taskStatesResult.value.data));
      } else {
        console.error(taskStatesResult.reason);
        setTaskStateIdMap(createEmptyTaskStateMap());
        encounteredErrors.push('No se pudieron cargar los estados de tarea.');
      }

      if (resourcesResult.status === 'fulfilled') {
        setResourceCatalog(resourcesResult.value.data.map(mapApiResourceToResource));
      } else {
        console.error(resourcesResult.reason);
        setResourceCatalog([]);
        encounteredErrors.push('No se pudo cargar el catálogo de recursos.');
      }

      if (projectsResult.status === 'fulfilled') {
        const mappedProjects = projectsResult.value.data.map((project) => mapApiProjectToProject(project));
        setProjects(mappedProjects);
      } else {
        console.error(projectsResult.reason);
        setProjects([]);
        encounteredErrors.push('No se pudieron cargar los proyectos.');
      }

      if (user?.roleName === 'GESTOR') {
        try {
          const { data: collaboratorsResponse } = await apiClient.get<ApiEmployee[]>(
            `/employees/collaborators`,
            withAuthorization(token)
          );
          setExternalCollaborators(collaboratorsResponse.map(mapEmployeeToCollaborator));
        } catch (collaboratorsError) {
          console.error(collaboratorsError);
          setExternalCollaborators([]);
          encounteredErrors.push('No se pudieron cargar los colaboradores externos.');
        }
      } else {
        setExternalCollaborators([]);
      }
      setError(encounteredErrors.length > 0 ? encounteredErrors.join(' ') : null);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los datos desde el backend.');
    } finally {
      setIsLoading(false);
    }
  }, [token, user?.roleName, resetState]);

  useEffect(() => {
    if (!token) {
      resetState();
      return;
    }
    loadInitialData();
 }, [token, user?.roleName, loadInitialData, resetState]);

  const refresh = useCallback(async () => {
    await loadInitialData();
  }, [loadInitialData]);

  const ensureAuthenticated = useCallback(() => {
    if (!token) {
      throw new Error('No se pudo completar la operación: sesión expirada.');
    }
  }, [token]);

  const resolvePriorityId = useCallback(
    (priority: PriorityLevel) => {
      const priorityId = priorityIdMap[priority];
      if (!priorityId) {
        throw new Error('No se encontró la prioridad seleccionada en el catálogo.');
      }
      return priorityId;
    },
    [priorityIdMap]
  );

  const resolveTaskStateId = useCallback(
    (status: TaskStatus) => {
      const stateId = taskStateIdMap[status];
      if (!stateId) {
        throw new Error('No se encontró el estado de tarea en el catálogo.');
      }
      return stateId;
    },
    [taskStateIdMap]
  );

  const createProjectHandler = useCallback(
    async (payload: CreateProjectPayload) => {
      ensureAuthenticated();
      const priorityId = resolvePriorityId(payload.priority);

      const { data } = await apiClient.post<ApiProject>(
        '/projects',
        {
          name: payload.name.trim(),
          description: payload.description.trim(),
          startDate: payload.startDate,
          estimatedDate: payload.endDate,
          budget: payload.budget,
          priorityId
        },
        withAuthorization(token)
      );

      const project = await loadProject(data.id);
      return project ?? mapApiProjectToProject(data);
    },
    [ensureAuthenticated, resolvePriorityId, token, loadProject]
  );

  const createTaskHandler = useCallback(
    async (projectId: string, payload: CreateTaskPayload) => {
      ensureAuthenticated();
      const priorityId = resolvePriorityId(payload.priority);

      const { data } = await apiClient.post<ApiTask>(
        `/projects/${projectId}/tasks`,
        {
          description: payload.name.trim(),
          priorityId,
          startDate: payload.startDate,
          estimatedDate: payload.dueDate
        },
        withAuthorization(token)
      );

      const project = await loadProject(projectId);
      const createdTask = project?.tasks.find((task) => task.id === data.id);
      return (
        createdTask ?? {
          id: data.id,
          name: data.description,
          priority: mapPriorityDescription(data.priority),
          startDate: data.startDate ?? project?.startDate ?? payload.startDate,
          dueDate: data.estimatedDate ?? payload.dueDate,
          status: mapTaskStatusDescription(data.state),
          description: payload.description ?? '',
          assigneeIds: [],
          documentation: [],
          resources: [],
          progressNotes: [],
          createdAt: data.startDate ?? new Date().toISOString()
        }
      );
    },
    [ensureAuthenticated, resolvePriorityId, token, loadProject]
  );

  const deleteTaskHandler = useCallback(
    async (projectId: string, taskId: string) => {
      ensureAuthenticated();
      await apiClient.delete(
        `/projects/${projectId}/tasks/${taskId}`,
        withAuthorization(token)
      );
      await loadProject(projectId);
    },
    [ensureAuthenticated, token, loadProject]
  );

  const setTaskCollaboratorsHandler = useCallback(
    async (projectId: string, taskId: string, collaboratorIds: string[]) => {
      ensureAuthenticated();
      await apiClient.post(
        `/projects/${projectId}/tasks/${taskId}/collaborators`,
        { collaboratorIds },
        withAuthorization(token)
      );
      await loadProject(projectId);
    },
    [ensureAuthenticated, token, loadProject]
  );

  const assignResourceHandler = useCallback(
    async (projectId: string, taskId: string, resourceId: string, quantity: number) => {
      ensureAuthenticated();
      const sanitizedQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
      const { data } = await apiClient.post<ApiTaskProjectResource>(
        `/projects/${projectId}/tasks/${taskId}/resources`,
        { resourceId, quantity: sanitizedQuantity },
        withAuthorization(token)
      );
      const project = await loadProject(projectId);
      const updatedTask = project?.tasks.find((task) => task.id === taskId);
      const assignment = updatedTask?.resources.find((resource) => resource.id === data.id);
      return (
        assignment ?? {
          id: data.id,
          resourceId: data.resource.id,
          name: data.resource.description,
          quantity: data.quantity,
          unitCost: Number(data.resource.unitCost),
          cost: Number(data.resource.unitCost) * data.quantity,
          assignedAt: new Date().toISOString()
        }
      );
    },
    [ensureAuthenticated, token, loadProject]
  );

  const removeResourceHandler = useCallback(
    async (_projectId: string, _taskId: string, _assignmentId: string) => {
      throw new Error('La eliminación de recursos aún no está disponible en el backend.');
    },
    []
  );

  const addDocumentationHandler = useCallback(
    async (projectId: string, taskId: string, files: File[]): Promise<TaskDocument[]> => {
      ensureAuthenticated();

      if (files.length === 0) {
        return [];
      }

      const readFileAsBase64 = (file: File) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result;
            if (typeof result === 'string') {
              const [, base64] = result.split(',');
              resolve(base64 ?? result);
            } else {
              reject(new Error('No se pudo leer el archivo seleccionado.'));
            }
          };
          reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado.'));
          reader.readAsDataURL(file);
        });

      try {
        const responses = await Promise.all(
          files.map(async (file) => {
            const base64 = await readFileAsBase64(file);
            const extension = file.name.includes('.')
              ? file.name.split('.').pop() ?? ''
              : '';

            const { data } = await apiClient.post<ApiDocument>(
              `/documents/tasks/${taskId}`,
              {
                fileName: file.name,
                mimeType: file.type || 'application/octet-stream',
                extension: extension || 'bin',
                sizeBytes: file.size,
                contentBase64: base64
              },
              withAuthorization(token)
            );

            return data;
          })
        );

        await loadProject(projectId);

        return responses.map((document) => ({
          id: document.id,
          name: document.fileName,
          uploadedAt: document.uploadedAt
        }));
      } catch (error) {
        throw new Error(
          extractApiErrorMessage(
            error,
            'No se pudo adjuntar la documentación. Verifica los archivos e intenta nuevamente.'
          )
        );
      }
    },
    [ensureAuthenticated, token, loadProject]
  );

  const removeDocumentationHandler = useCallback(
    async (projectId: string, _taskId: string, documentId: string) => {
      ensureAuthenticated();
      await apiClient.delete(`/documents/${documentId}`, withAuthorization(token));
      await loadProject(projectId);
    },
    [ensureAuthenticated, token, loadProject]
  );

  const updateTaskStatusHandler = useCallback(
    async (projectId: string, taskId: string, status: TaskStatus, note: string) => {
      ensureAuthenticated();
      const stateId = resolveTaskStateId(status);
      const payload = {
        stateId,
        description: note.trim() || 'Actualización registrada'
      };

      try {
        await apiClient.patch(
          `/projects/${projectId}/tasks/${taskId}/status`,
          payload,
          withAuthorization(token)
        );
        await loadProject(projectId);
      } catch (error) {
        throw new Error(
          extractApiErrorMessage(
            error,
            'No se pudo actualizar el estado de la tarea. Intenta nuevamente.'
          )
        );
      }
    },
    [ensureAuthenticated, resolveTaskStateId, token, loadProject]
  );

  const registerCollaboratorHandler = useCallback(
    async (payload: RegisterCollaboratorPayload) => {
      ensureAuthenticated();
      if (payload.role !== 'Colaborador') {
        throw new Error('Solo se pueden crear usuarios colaboradores desde la aplicación.');
      }

      try {
        const { data } = await apiClient.post<ApiEmployee>(
          '/employees/collaborators',
          {
            firstName: payload.firstName.trim(),
            lastName: payload.lastName.trim(),
            email: payload.email.trim().toLowerCase(),
            phone: payload.phone.trim(),
            password: payload.password
          },
          withAuthorization(token)
        );

        const collaborator = mapEmployeeToCollaborator(data);
        setExternalCollaborators((prev) => {
          if (prev.some((item) => item.id === collaborator.id)) {
            return prev;
          }
          return [...prev, collaborator];
        });
        return collaborator;
      } catch (error) {
        throw new Error(
          extractApiErrorMessage(
            error,
            'No se pudo registrar el colaborador. Verifica la información e intenta nuevamente.'
          )
        );
      }
    },
    [ensureAuthenticated, token]
  );

  const contextValue = useMemo(
    () => ({
      projects,
      collaborators,
      resources,
      isLoading,
      error,
      refresh,
      loadProject: loadProject,
      createProject: createProjectHandler,
      createTask: createTaskHandler,
      deleteTask: deleteTaskHandler,
      setTaskCollaborators: setTaskCollaboratorsHandler,
      assignResourceToTask: assignResourceHandler,
      removeResourceFromTask: removeResourceHandler,
      addDocumentationToTask: addDocumentationHandler,
      removeDocumentationFromTask: removeDocumentationHandler,
      updateTaskStatus: updateTaskStatusHandler,
      registerCollaborator: registerCollaboratorHandler
    }),
    [
      projects,
      collaborators,
      resources,
      isLoading,
      error,
      refresh,
      loadProject,
      createProjectHandler,
      createTaskHandler,
      deleteTaskHandler,
      setTaskCollaboratorsHandler,
      assignResourceHandler,
      removeResourceHandler,
      addDocumentationHandler,
      removeDocumentationHandler,
      updateTaskStatusHandler,
      registerCollaboratorHandler
    ]
  );

  return <ProjectManagementContext.Provider value={contextValue}>{children}</ProjectManagementContext.Provider>;
};

export const useProjectManagement = () => {
  const context = useContext(ProjectManagementContext);
  if (!context) {
    throw new Error('useProjectManagement debe utilizarse dentro de un ProjectManagementProvider');
  }
  return context;
};