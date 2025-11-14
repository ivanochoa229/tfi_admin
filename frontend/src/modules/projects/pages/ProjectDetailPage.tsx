import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../../auth/AuthContext';
import {
  CreateTaskPayload,
  useProjectManagement
} from '../../shared/context/ProjectManagementContext';
import {
  PriorityLevel,
  Task,
  TaskStatus
} from '../../shared/types/project';
import { canUserAccessProject, getTasksVisibleToUser } from '../../shared/utils/access';
import { isManagerRole } from '../../shared/utils/roles';
import {
  formatCurrency,
  formatDateTime,
  getCollaboratorFullName,
  normalizeDateTimeInput
} from '../../shared/utils/format';
import StatusBadge from '../components/StatusBadge';
import TaskEvolutionModal from '../components/TaskEvolutionModal';
import TaskManagementModal from '../components/TaskManagementModal';
import './ProjectDetailPage.css';
import useDismissOnInteraction from '../../shared/hooks/useDismissOnInteraction';

const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  [PriorityLevel.Low]: 'Baja',
  [PriorityLevel.Medium]: 'Media',
  [PriorityLevel.High]: 'Alta'
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.Created]: 'Creada',
  [TaskStatus.Pending]: 'Pendiente',
  [TaskStatus.InProgress]: 'En curso',
  [TaskStatus.InReview]: 'En revisión',
  [TaskStatus.Completed]: 'Completada'
};

const EMPTY_TASK_FORM: CreateTaskPayload = {
  name: '',
  priority: PriorityLevel.Medium,
  startDate: '',
  dueDate: '',
  description: ''
};

const ProjectDetailPage = () => {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const {
    projects,
    collaborators,
    availableCollaborators,
    resources,
    createTask,
    deleteTask,
    setTaskCollaborators,
    assignResourceToTask,
    removeResourceFromTask,
    addDocumentationToTask,
    removeDocumentationFromTask,
    updateTaskStatus,
    loadProject,
    isLoading
  } = useProjectManagement();
  const { user } = useAuth();

  const project = useMemo(() => projects.find((item) => item.id === projectId), [projects, projectId]);
  const isManager = isManagerRole(user?.roleName);
  const collaboratorOptions = useMemo(() => availableCollaborators, [availableCollaborators]);
  const visibleTasks = useMemo(() => (project ? getTasksVisibleToUser(project, user) : []), [project, user]);
  const canViewProject = useMemo(() => (project ? canUserAccessProject(project, user) : false), [project, user]);

  const [taskForm, setTaskForm] = useState<CreateTaskPayload>(EMPTY_TASK_FORM);
  const [pendingTask, setPendingTask] = useState<CreateTaskPayload | null>(null);
  const [taskMessage, setTaskMessage] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [collaboratorDrafts, setCollaboratorDrafts] = useState<Record<string, string[]>>({});
  const [statusDrafts, setStatusDrafts] = useState<Record<string, { status: TaskStatus; note: string }>>({});
  const [resourceDrafts, setResourceDrafts] = useState<Record<string, { resourceId: string; quantity: string }>>({});
  const [documentationDrafts, setDocumentationDrafts] = useState<Record<string, File[]>>({});
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedTaskEvolution, setSelectedTaskEvolution] = useState<Task | null>(null);
  const [managedTask, setManagedTask] = useState<Task | null>(null);
   const [priorityFilter, setPriorityFilter] = useState<'all' | PriorityLevel>('all');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [sortOption, setSortOption] = useState<
    | 'none'
    | 'start-asc'
    | 'start-desc'
    | 'due-asc'
    | 'due-desc'
    | 'priority-asc'
    | 'priority-desc'
  >('none');

  const dismissFeedback = useCallback(() => {
    setTaskMessage(null);
    setTaskError(null);
    setActionFeedback(null);
    setActionError(null);
  }, []);

  const closeEvolutionModal = useCallback(() => {
    setSelectedTaskEvolution(null);
  }, []);

  const closeTaskManagement = useCallback(() => {
    setManagedTask(null);
  }, []);

  const hasFeedback = Boolean(taskMessage || taskError || actionFeedback || actionError);
  useDismissOnInteraction(hasFeedback, dismissFeedback);

  if (isLoading && !project) {
    return (
      <div className="project-detail">
        <p>Cargando información del proyecto...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="project-detail">
        <p>No se encontró el proyecto solicitado.</p>
        <button type="button" className="link" onClick={() => navigate('/projects')}>
          Volver a proyectos
        </button>
      </div>
    );
  }

  if (!canViewProject) {
    return (
      <div className="project-detail">
        <p>No tienes permisos para acceder a este proyecto.</p>
        <button type="button" className="link" onClick={() => navigate('/projects')}>
          Volver a mis proyectos
        </button>
      </div>
    );
  }

  const managerName = getCollaboratorFullName(collaborators, project.managerId);
  const tasksToRender = isManager ? project.tasks : visibleTasks;
  const emptyTasksMessage = isManager
    ? 'Aún no se registraron tareas para este proyecto.'
    : 'No tienes tareas asignadas en este proyecto.';

    const filteredTasks = useMemo(() => {
    return tasksToRender.filter((task) => {
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;

      const dueDate = new Date(task.dueDate);
      let matchesDate = true;

      if (startDateFilter) {
        const filterStart = new Date(startDateFilter);
        matchesDate = matchesDate && dueDate >= filterStart;
      }

      if (endDateFilter) {
        const filterEnd = new Date(endDateFilter);
        filterEnd.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && dueDate <= filterEnd;
      }

      return matchesPriority && matchesDate;
    });
  }, [tasksToRender, priorityFilter, startDateFilter, endDateFilter]);

  const sortedTasks = useMemo(() => {
    if (sortOption === 'none') {
      return filteredTasks;
    }

    const priorityWeight: Record<PriorityLevel, number> = {
      [PriorityLevel.High]: 3,
      [PriorityLevel.Medium]: 2,
      [PriorityLevel.Low]: 1
    };

    const tasksWithIndex = filteredTasks.map((task, index) => ({ task, index }));

    tasksWithIndex.sort((a, b) => {
      let comparison = 0;

      switch (sortOption) {
        case 'start-asc':
          comparison = new Date(a.task.startDate).getTime() - new Date(b.task.startDate).getTime();
          break;
        case 'start-desc':
          comparison = new Date(b.task.startDate).getTime() - new Date(a.task.startDate).getTime();
          break;
        case 'due-asc':
          comparison = new Date(a.task.dueDate).getTime() - new Date(b.task.dueDate).getTime();
          break;
        case 'due-desc':
          comparison = new Date(b.task.dueDate).getTime() - new Date(a.task.dueDate).getTime();
          break;
        case 'priority-asc':
          comparison = priorityWeight[a.task.priority] - priorityWeight[b.task.priority];
          break;
        case 'priority-desc':
          comparison = priorityWeight[b.task.priority] - priorityWeight[a.task.priority];
          break;
        default:
          comparison = 0;
      }

      if (comparison !== 0) {
        return comparison;
      }

      return a.index - b.index;
    });

    return tasksWithIndex.map(({ task }) => task);
  }, [filteredTasks, sortOption]);

  const hasActiveFilters = priorityFilter !== 'all' || startDateFilter !== '' || endDateFilter !== '';

  const clearTaskFilters = () => {
    setPriorityFilter('all');
    setStartDateFilter('');
    setEndDateFilter('');
    setSortOption('none');
  };

  const totalTasksLabel = hasActiveFilters
    ? `${sortedTasks.length} de ${tasksToRender.length} registradas`
    : `${tasksToRender.length} registradas`;
  const canResetFilters = hasActiveFilters || sortOption !== 'none';

  const handleTaskFieldChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setTaskForm((prev) => {
      if (name === 'priority') {
        return { ...prev, priority: value as PriorityLevel };
      }

      if (name === 'description') {
        return { ...prev, description: value };
      }

      if (name === 'startDate' || name === 'dueDate' || name === 'name') {
        return { ...prev, [name]: value } as CreateTaskPayload;
      }

      return prev;
    });
  };

  const handleTaskSubmit = (event: FormEvent) => {
    event.preventDefault();
    setTaskError(null);
    setTaskMessage(null);

    if (!taskForm.name.trim() || !taskForm.startDate || !taskForm.dueDate) {
      setTaskError('Todos los campos de la tarea son obligatorios.');
      return;
    }

    const normalizedStart = normalizeDateTimeInput(taskForm.startDate);
    const normalizedDueDate = normalizeDateTimeInput(taskForm.dueDate);

    setPendingTask({ ...taskForm, startDate: normalizedStart, dueDate: normalizedDueDate });
  };

  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }
  }, [projectId, loadProject]);

  const confirmTaskCreation = async () => {
    if (!pendingTask) {
      return;
    }

    try {
      await createTask(project.id, pendingTask);
      setTaskMessage(`La tarea "${pendingTask.name}" fue creada correctamente.`);
      setPendingTask(null);
      setTaskForm(EMPTY_TASK_FORM);
    } catch (err) {
      if (err instanceof Error) {
        setTaskError(err.message);
      } else {
        setTaskError('No fue posible crear la tarea.');
      }
    }
  };

  const cancelTaskConfirmation = () => {
    setPendingTask(null);
  };

  const openTaskManagement = (task: Task) => {
    setManagedTask(task);
    setActionError(null);
    setActionFeedback(null);
  };

  const handleCollaboratorToggle = (task: Task, collaboratorId: string) => {
    setCollaboratorDrafts((prev) => {
      const current = prev[task.id] ?? task.assigneeIds;
      const exists = current.includes(collaboratorId);
      const updated = exists
        ? current.filter((id) => id !== collaboratorId)
        : [...current, collaboratorId];
      return { ...prev, [task.id]: updated };
    });
  };

  const confirmCollaboratorUpdate = async (task: Task) => {
    const selected = collaboratorDrafts[task.id] ?? task.assigneeIds;
    try {
      await setTaskCollaborators(project.id, task.id, selected);
      setActionError(null);
      setActionFeedback('Colaboradores actualizados correctamente.');
    } catch (err) {
      if (err instanceof Error) {
        setActionError(err.message);
      } else {
        setActionError('No se pudieron actualizar los colaboradores.');
      }
    }
  };

  const handleStatusDraftChange = (task: Task, field: 'status' | 'note', value: string) => {
    setStatusDrafts((prev) => ({
      ...prev,
      [task.id]: {
        status: field === 'status' ? (value as TaskStatus) : prev[task.id]?.status ?? task.status,
        note: field === 'note' ? value : prev[task.id]?.note ?? ''
      }
    }));
  };

  const confirmStatusUpdate = async (task: Task) => {
    const draft = statusDrafts[task.id];
    if (!draft) {
      setActionError('Selecciona un nuevo estado y describe el avance antes de confirmar.');
      return;
    }

    try {
      await updateTaskStatus(project.id, task.id, draft.status, draft.note);
      setActionFeedback('El estado de la tarea se actualizó correctamente.');
      setActionError(null);
      setStatusDrafts((prev) => ({ ...prev, [task.id]: { status: draft.status, note: '' } }));
    } catch (err) {
      if (err instanceof Error) {
        setActionError(err.message);
      } else {
        setActionError('No se pudo actualizar el estado.');
      }
    }
  };

  const prepareResourceAssignment = (task: Task, resourceId: string) => {
    setResourceDrafts((prev) => ({
      ...prev,
      [task.id]: {
        resourceId,
        quantity: prev[task.id]?.quantity ?? '1'
      }
    }));
  };

  const handleResourceQuantityChange = (taskId: string, quantity: string) => {
    setResourceDrafts((prev) => ({
      ...prev,
      [taskId]: {
        resourceId: prev[taskId]?.resourceId ?? '',
        quantity
      }
    }));
  };

  const confirmResourceAssignment = async (task: Task) => {
    const draft = resourceDrafts[task.id];
    if (!draft?.resourceId) {
      setActionError('Selecciona un recurso para asignar.');
      return;
    }

    const parsedQuantity = Number(draft.quantity);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setActionError('Ingresa una cantidad válida mayor a cero.');
      return;
    }

    try {
      await assignResourceToTask(project.id, task.id, draft.resourceId, parsedQuantity);
      setActionFeedback('Recurso asignado y presupuesto actualizado.');
      setActionError(null);
      setResourceDrafts((prev) => ({
        ...prev,
        [task.id]: { resourceId: '', quantity: '1' }
      }));
    } catch (err) {
      if (err instanceof Error) {
        setActionError(err.message);
      } else {
        setActionError('No se pudo asignar el recurso.');
      }
    }
  };

  const confirmResourceRemoval = async (taskId: string, assignmentId: string) => {
    try {
      await removeResourceFromTask(project.id, taskId, assignmentId);
      setActionError(null);
      setActionFeedback('El recurso se eliminó de la tarea.');
    } catch (err) {
      if (err instanceof Error) {
        setActionError(err.message);
      } else {
        setActionError('No se pudo eliminar el recurso.');
      }
    }
  };

  const handleDocumentationSelection = (taskId: string, event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    setActionError(null);
    setActionFeedback(null);

    setDocumentationDrafts((prev) => {
      const existing = prev[taskId] ?? [];
      const combined = [...existing, ...files];
      const unique = combined.filter((file, index, array) => {
        const identifier = `${file.name}-${file.size}-${file.lastModified}`;
        return (
          array.findIndex(
            (candidate) =>
              `${candidate.name}-${candidate.size}-${candidate.lastModified}` === identifier
          ) === index
        );
      });

      return {
        ...prev,
        [taskId]: unique
      };
    });

    event.target.value = '';
  };

  const confirmDocumentationUpload = async (taskId: string) => {
    const files = documentationDrafts[taskId];
    if (!files || files.length === 0) {
      setActionError('Selecciona al menos un archivo para adjuntar.');
      return;
    }

    try {
      setActionError(null);
      setActionFeedback(null);
      await addDocumentationToTask(project.id, taskId, files);
      setDocumentationDrafts((prev) => ({ ...prev, [taskId]: [] }));
      setActionFeedback('Documentación añadida correctamente.');
    } catch (err) {
      if (err instanceof Error) {
        setActionError(err.message);
      } else {
        setActionError('No se pudo adjuntar la documentación.');
      }
    }
  };

    const clearDocumentationSelection = (taskId: string) => {
    setDocumentationDrafts((prev) => ({ ...prev, [taskId]: [] }));
    setActionError(null);
    setActionFeedback(null);
  };

  const confirmDocumentRemoval = async (taskId: string, documentId: string) => {
    try {
      await removeDocumentationFromTask(project.id, taskId, documentId);
      setActionError(null);
      setActionFeedback('Documento eliminado.');
    } catch (err) {
      if (err instanceof Error) {
        setActionError(err.message);
      } else {
        setActionError('No se pudo eliminar el documento.');
      }
    }
  };

  const confirmTaskDeletion = async (task: Task) => {
    if (window.confirm('¿Seguro que deseas eliminar la tarea seleccionada?')) {
      try {
        await deleteTask(project.id, task.id);
        setActionError(null);
        setActionFeedback('La tarea fue eliminada correctamente.');
      } catch (err) {
        if (err instanceof Error) {
          setActionError(err.message);
        } else {
          setActionError('No se pudo eliminar la tarea.');
        }
      }
    }
  };

  return (
    <>
      <div className="project-detail">
      <header className="project-detail__header">
        <div>
          <h2>{project.name}</h2>
          <p>{project.description}</p>
        </div>
        <StatusBadge status={project.status} />
      </header>

      <section className="project-detail__section">
        <h3>Información general</h3>
        <div className="project-detail__grid">
          <div>
            <span>Gestor responsable</span>
            <strong>{managerName}</strong>
          </div>
          <div>
            <span>Fechas</span>
            <strong>
              {formatDateTime(project.startDate)} - {formatDateTime(project.endDate)}
            </strong>
          </div>
          <div>
            <span>Prioridad</span>
            <strong>{PRIORITY_LABELS[project.priority]}</strong>
          </div>
          {isManager && (
            <div>
              <span>Presupuesto utilizado</span>
              <strong>
                {formatCurrency(project.usedBudget)} / {formatCurrency(project.budget)}
              </strong>
            </div>
          )}
        </div>
      </section>

      {isManager && (
        <section className="project-detail__section">
          <h3>Registrar nueva tarea</h3>
          <form className="task-form" onSubmit={handleTaskSubmit}>
            <div className="task-form__grid">
              <label>
                Nombre
                <input name="name" value={taskForm.name} onChange={handleTaskFieldChange} required />
              </label>
              <label>
                Prioridad
                <select name="priority" value={taskForm.priority} onChange={handleTaskFieldChange}>
                  {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Fecha inicio
                <input
                  type="datetime-local"
                  step={1}
                  name="startDate"
                  value={taskForm.startDate}
                  onChange={handleTaskFieldChange}
                  required
                />
              </label>
              <label>
                Fecha estimada
                <input
                  type="datetime-local"
                  step={1}
                  name="dueDate"
                  value={taskForm.dueDate}
                  onChange={handleTaskFieldChange}
                  required
                />
              </label>
            </div>
            <label className="task-form__description">
              Descripción
              <textarea
                name="description"
                value={taskForm.description}
                onChange={handleTaskFieldChange}
                rows={3}
                placeholder="Describe brevemente el alcance de la tarea"
              />
            </label>
            <div className="task-form__actions">
              <button type="submit">Validar datos</button>
            </div>
          </form>
          {taskError && <div className="alert alert--error">{taskError}</div>}
          {taskMessage && <div className="alert alert--success">{taskMessage}</div>}

          {pendingTask && (
            <div className="task-confirmation">
              <h4>Confirmar creación de tarea</h4>
              <ul>
                <li>
                  <strong>Nombre:</strong> {pendingTask.name}
                </li>
                <li>
                  <strong>Prioridad:</strong> {PRIORITY_LABELS[pendingTask.priority]}
                </li>
                <li>
                  <strong>Fechas:</strong> {formatDateTime(pendingTask.startDate)} →{' '}
                  {formatDateTime(pendingTask.dueDate)}
                </li>
                <li>
                  <strong>Descripción:</strong> {pendingTask.description || 'Sin descripción'}
                </li>
              </ul>
              <div className="task-form__actions">
                <button type="button" className="secondary" onClick={cancelTaskConfirmation}>
                  Editar
                </button>
                <button type="button" onClick={confirmTaskCreation}>
                  Confirmar creación
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="project-detail__section">
        <div className="project-detail__section-header">
          <h3>{isManager ? 'Tareas del proyecto' : 'Mis tareas asignadas'}</h3>
          <span>{totalTasksLabel}</span>
        </div>

        {!managedTask && actionFeedback && <div className="alert alert--success">{actionFeedback}</div>}
        {!managedTask && actionError && <div className="alert alert--error">{actionError}</div>}

        <div className="task-controls">
          <label>
            Prioridad
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value as 'all' | PriorityLevel)}
            >
              <option value="all">Todas</option>
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Fecha estimada desde
            <input type="date" value={startDateFilter} onChange={(event) => setStartDateFilter(event.target.value)} />
          </label>
          <label>
            Fecha estimada hasta
            <input type="date" value={endDateFilter} onChange={(event) => setEndDateFilter(event.target.value)} />
          </label>
          <label>
            Ordenar por
            <select
              value={sortOption}
              onChange={(event) =>
                setSortOption(
                  event.target.value as
                    | 'none'
                    | 'start-asc'
                    | 'start-desc'
                    | 'due-asc'
                    | 'due-desc'
                    | 'priority-asc'
                    | 'priority-desc'
                )
              }
            >
              <option value="none">Sin orden (predeterminado)</option>
              <option value="start-asc">Fecha de inicio (más antigua primero)</option>
              <option value="start-desc">Fecha de inicio (más reciente primero)</option>
              <option value="due-asc">Fecha estimada (más cercana primero)</option>
              <option value="due-desc">Fecha estimada (más lejana primero)</option>
              <option value="priority-asc">Prioridad (de baja a alta)</option>
              <option value="priority-desc">Prioridad (de alta a baja)</option>
            </select>
          </label>
          <button type="button" onClick={clearTaskFilters} disabled={!canResetFilters}>
            Limpiar
          </button>
        </div>

        <div className="task-table__wrapper">
          {sortedTasks.length === 0 ? (
            <p className="task-card__empty">
              {tasksToRender.length === 0
                ? emptyTasksMessage
                : 'No se encontraron tareas con los filtros aplicados.'}
            </p>
          ) : (
            <table className="task-table">
              <thead>
                <tr>
                  <th>Tarea</th>
                  <th>Prioridad</th>
                  <th>Estado y fechas</th>
                  <th>Colaboradores</th>
                  <th>Recursos asignados</th>
                  <th>Documentación</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedTasks.map((task) => {
                  const isManaged = managedTask?.id === task.id;
                  const isCompleted = task.status === TaskStatus.Completed;
                  const shouldShowManagementToggle = !isCompleted || isManaged;
                  const canDeleteTask = isManager && !isCompleted;
                  const canRemoveResources = isManager && !isCompleted;

                  return (
                    <tr key={task.id}>
                      <td>
                        <div className="task-table__name">
                          <strong>{task.name}</strong>
                          <span>{task.description || 'Sin descripción registrada.'}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`priority priority--${task.priority.toLowerCase()}`}>
                          {PRIORITY_LABELS[task.priority]}
                        </span>
                      </td>
                      <td>
                        <div className="task-table__meta">
                          <span>{STATUS_LABELS[task.status]}</span>
                          <span>
                            {formatDateTime(task.startDate)} → {formatDateTime(task.dueDate)}
                          </span>
                        </div>
                      </td>
                      <td>
                        {task.assigneeIds.length === 0 ? (
                          <p className="task-card__empty">Sin colaboradores asignados.</p>
                        ) : (
                          <ul className="task-table__list">
                            {task.assigneeIds.map((id) => (
                              <li key={id}>{getCollaboratorFullName(collaborators, id)}</li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td>
                        {task.resources.length === 0 ? (
                          <p className="task-card__empty">Aún no se asignaron recursos.</p>
                        ) : (
                          <ul className="task-table__resource-list">
                            {task.resources.map((resource) => (
                              <li key={resource.id}>
                                <div>
                                  <strong>{resource.name}</strong>
                                  <span>
                                    {resource.quantity} unidad{resource.quantity === 1 ? '' : 'es'} •{' '}
                                    {formatCurrency(resource.unitCost)} c/u
                                  </span>
                                  <span>{new Date(resource.assignedAt).toLocaleString()}</span>
                                </div>
                                <div className="task-table__resource-actions">
                                  <span>{formatCurrency(resource.cost)}</span>
                                  {canRemoveResources && (
                                    <button
                                      type="button"
                                      onClick={() => confirmResourceRemoval(task.id, resource.id)}
                                    >
                                      Quitar
                                    </button>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td>
                        {task.documentation.length === 0 ? (
                          <p className="task-card__empty">No se adjuntaron documentos.</p>
                        ) : (
                          <ul className="task-table__document-list">
                            {task.documentation.map((document) => (
                              <li key={document.id}>
                                <div>
                                  <strong>{document.name}</strong>
                                  <span>{new Date(document.uploadedAt).toLocaleString()}</span>
                                </div>
                                {!isCompleted && (
                                  <div className="task-table__document-actions">
                                    <button
                                      type="button"
                                      onClick={() => confirmDocumentRemoval(task.id, document.id)}
                                    >
                                      Eliminar
                                    </button>
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td>
                        <div className="task-table__actions">
                          <button type="button" className="secondary" onClick={() => setSelectedTaskEvolution(task)}>
                            Ver evolución
                          </button>
                          {shouldShowManagementToggle && (
                            <button
                              type="button"
                              onClick={() => (isManaged ? closeTaskManagement() : openTaskManagement(task))}
                            >
                              {isManaged ? 'Cerrar gestión' : 'Gestionar tarea'}
                            </button>
                          )}
                          {canDeleteTask && (
                            <button type="button" className="danger" onClick={() => confirmTaskDeletion(task)}>
                              Eliminar tarea
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
    {managedTask && (
      <TaskManagementModal
        task={managedTask}
        onClose={closeTaskManagement}
        isManager={isManager}
        collaboratorOptions={collaboratorOptions}
        collaboratorSelection={collaboratorDrafts[managedTask.id] ?? managedTask.assigneeIds}
        onToggleCollaborator={(collaboratorId) =>
          handleCollaboratorToggle(managedTask, collaboratorId)
        }
        onConfirmCollaborators={() => confirmCollaboratorUpdate(managedTask)}
        statusDraft={statusDrafts[managedTask.id]}
        statusLabels={STATUS_LABELS}
        onStatusChange={(field, value) => handleStatusDraftChange(managedTask, field, value)}
        onConfirmStatus={() => confirmStatusUpdate(managedTask)}
        resources={resources}
        resourceDraft={resourceDrafts[managedTask.id]}
        onPrepareResource={(resourceId) => prepareResourceAssignment(managedTask, resourceId)}
        onResourceQuantityChange={(quantity) => handleResourceQuantityChange(managedTask.id, quantity)}
        onConfirmResource={() => confirmResourceAssignment(managedTask)}
        documentationDraft={documentationDrafts[managedTask.id] ?? []}
        onSelectDocumentation={(event) => handleDocumentationSelection(managedTask.id, event)}
        onConfirmDocumentation={() => confirmDocumentationUpload(managedTask.id)}
        onClearDocumentation={() => clearDocumentationSelection(managedTask.id)}
        priorityLabels={PRIORITY_LABELS}
        actionFeedback={actionFeedback}
        actionError={actionError}
      />
    )}
    {selectedTaskEvolution && (
      <TaskEvolutionModal task={selectedTaskEvolution} onClose={closeEvolutionModal} />
    )}
    </>
  );
};

export default ProjectDetailPage;