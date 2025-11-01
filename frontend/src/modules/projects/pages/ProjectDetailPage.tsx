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
import { formatCurrency, getCollaboratorFullName } from '../../shared/utils/format';
import StatusBadge from '../components/StatusBadge';
import './ProjectDetailPage.css';
import useDismissOnInteraction from '../../shared/hooks/useDismissOnInteraction';

const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  [PriorityLevel.Low]: 'Baja',
  [PriorityLevel.Medium]: 'Media',
  [PriorityLevel.High]: 'Alta'
};

const STATUS_LABELS: Record<TaskStatus, string> = {
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
  const isManager = user?.role === 'Gestor de proyecto';
  const visibleTasks = useMemo(() => (project ? getTasksVisibleToUser(project, user) : []), [project, user]);
  const canViewProject = useMemo(() => (project ? canUserAccessProject(project, user) : false), [project, user]);

  const [taskForm, setTaskForm] = useState<CreateTaskPayload>(EMPTY_TASK_FORM);
  const [pendingTask, setPendingTask] = useState<CreateTaskPayload | null>(null);
  const [taskMessage, setTaskMessage] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [collaboratorDrafts, setCollaboratorDrafts] = useState<Record<string, string[]>>({});
  const [statusDrafts, setStatusDrafts] = useState<Record<string, { status: TaskStatus; note: string }>>({});
  const [resourceDrafts, setResourceDrafts] = useState<Record<string, { resourceId: string; quantity: string }>>({});
  const [documentationDrafts, setDocumentationDrafts] = useState<Record<string, File[]>>({});
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const dismissFeedback = useCallback(() => {
    setTaskMessage(null);
    setTaskError(null);
    setActionFeedback(null);
    setActionError(null);
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

    setPendingTask(taskForm);
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

  const toggleTaskSection = (taskId: string) => {
    setExpandedTaskId((current) => (current === taskId ? null : taskId));
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
              {new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}
            </strong>
          </div>
          <div>
            <span>Prioridad</span>
            <strong>{PRIORITY_LABELS[project.priority]}</strong>
          </div>
          <div>
            <span>Presupuesto utilizado</span>
            <strong>
              {formatCurrency(project.usedBudget)} / {formatCurrency(project.budget)}
            </strong>
          </div>
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
                <input type="date" name="startDate" value={taskForm.startDate} onChange={handleTaskFieldChange} required />
              </label>
              <label>
                Fecha estimada
                <input type="date" name="dueDate" value={taskForm.dueDate} onChange={handleTaskFieldChange} required />
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
                  <strong>Fechas:</strong> {pendingTask.startDate} → {pendingTask.dueDate}
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
          <span>{tasksToRender.length} registradas</span>
        </div>

        {actionFeedback && <div className="alert alert--success">{actionFeedback}</div>}
        {actionError && <div className="alert alert--error">{actionError}</div>}

        <div className="task-list">
          {tasksToRender.length === 0 && <p className="task-card__empty">{emptyTasksMessage}</p>}
          {tasksToRender.map((task) => {
            const collaboratorSelection = collaboratorDrafts[task.id] ?? task.assigneeIds;
            const statusDraft = statusDrafts[task.id];
            const pendingDocs = documentationDrafts[task.id] ?? [];
            const isExpanded = expandedTaskId === task.id;

            return (
              <article key={task.id} className="task-card">
                <header>
                  <div>
                    <h4>{task.name}</h4>
                    <span className={`priority priority--${task.priority.toLowerCase()}`}>
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                  </div>
                  <div className="task-card__meta">
                    <span>Estado: {STATUS_LABELS[task.status]}</span>
                    <span>
                      Fechas: {new Date(task.startDate).toLocaleDateString()} →{' '}
                      {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                </header>

                <p>{task.description || 'Sin descripción registrada.'}</p>

                <div className="task-card__section">
                  <h5>Colaboradores</h5>
                  {task.assigneeIds.length === 0 ? (
                    <p className="task-card__empty">Sin colaboradores asignados.</p>
                  ) : (
                    <ul>
                      {task.assigneeIds.map((id) => (
                        <li key={id}>{getCollaboratorFullName(collaborators, id)}</li>
                      ))}
                    </ul>
                  )}
                </div>

                  <div className="task-card__section">
                    <h5>Recursos asignados</h5>
                    {task.resources.length === 0 ? (
                      <p className="task-card__empty">Aún no se asignaron recursos.</p>
                    ) : (
                    <ul>
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
                          <div className="task-card__resource-actions">
                            <span>{formatCurrency(resource.cost)}</span>
                            {isManager && (
                              <button type="button" onClick={() => confirmResourceRemoval(task.id, resource.id)}>
                                Quitar
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="task-card__section">
                  <h5>Documentación</h5>
                  {task.documentation.length === 0 ? (
                    <p className="task-card__empty">No se adjuntaron documentos.</p>
                  ) : (
                    <ul>
                      {task.documentation.map((document) => (
                        <li key={document.id}>
                          <div>
                            <strong>{document.name}</strong>
                            <span>{new Date(document.uploadedAt).toLocaleString()}</span>
                          </div>
                          <button type="button" onClick={() => confirmDocumentRemoval(task.id, document.id)}>
                            Eliminar
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <footer className="task-card__actions">
                  <button type="button" onClick={() => toggleTaskSection(task.id)}>
                    {isExpanded ? 'Cerrar gestión' : 'Gestionar tarea'}
                  </button>
                  {isManager && (
                    <button type="button" className="danger" onClick={() => confirmTaskDeletion(task)}>
                      Eliminar tarea
                    </button>
                  )}
                </footer>

                {isExpanded && (
                  <div className="task-card__management">
                    {isManager && (
                      <div>
                        <h5>Actualizar colaboradores</h5>
                        <div className="task-card__options">
                          {collaborators.map((collaborator) => (
                            <label key={collaborator.id}>
                              <input
                                type="checkbox"
                                checked={collaboratorSelection.includes(collaborator.id)}
                                onChange={() => handleCollaboratorToggle(task, collaborator.id)}
                              />
                              {collaborator.firstName} {collaborator.lastName} ({collaborator.role})
                            </label>
                          ))}
                        </div>
                        <button type="button" onClick={() => confirmCollaboratorUpdate(task)}>
                          Confirmar colaboradores
                        </button>
                      </div>
                    )}

                    <div>
                      <h5>Actualizar estado</h5>
                      <div className="task-card__status">
                        <select
                          value={statusDraft?.status ?? task.status}
                          onChange={(event) => handleStatusDraftChange(task, 'status', event.target.value)}
                        >
                          {Object.entries(STATUS_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <textarea
                          placeholder="Describe el avance registrado"
                          value={statusDraft?.note ?? ''}
                          onChange={(event) => handleStatusDraftChange(task, 'note', event.target.value)}
                          rows={2}
                        />
                        <button type="button" onClick={() => confirmStatusUpdate(task)}>
                          Confirmar actualización
                        </button>
                      </div>
                    </div>

                    {isManager && (
                      <div>
                        <h5>Asignar recursos</h5>
                        <div className="task-card__resources-form">
                          <select
                            value={resourceDrafts[task.id]?.resourceId ?? ''}
                            onChange={(event) => prepareResourceAssignment(task, event.target.value)}
                          >
                            <option value="">Selecciona un recurso</option>
                            {resources.map((resource) => (
                              <option key={resource.id} value={resource.id}>
                                {resource.name} ({formatCurrency(resource.cost)})
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min={1}
                            value={resourceDrafts[task.id]?.quantity ?? '1'}
                            onChange={(event) => handleResourceQuantityChange(task.id, event.target.value)}
                            placeholder="Cantidad"
                          />
                          <button type="button" onClick={() => confirmResourceAssignment(task)}>
                            Confirmar asignación
                          </button>
                        </div>
                      </div>
                    )}

                    <div>
                      <h5>Gestionar documentación</h5>
                      <div className="task-card__documents">
                        <input
                          type="file"
                          multiple
                          onChange={(event) => handleDocumentationSelection(task.id, event)}
                        />
                        {pendingDocs.length > 0 && (
                          <div className="task-card__pending-docs">
                            <span>Archivos seleccionados:</span>
                            <ul>
                              {pendingDocs.map((file) => (
                                <li key={`${file.name}-${file.size}-${file.lastModified}`}>
                                  {file.name}
                                </li>
                              ))}
                            </ul>
                            <button type="button" onClick={() => confirmDocumentationUpload(task.id)}>
                              Confirmar carga
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default ProjectDetailPage;