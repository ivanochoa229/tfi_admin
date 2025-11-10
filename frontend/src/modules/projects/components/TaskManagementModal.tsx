import { ChangeEvent, MouseEvent, useEffect } from 'react';

import {
  Collaborator,
  PriorityLevel,
  Resource,
  Task,
  TaskStatus
} from '../../shared/types/project';
import {
  formatCurrency,
  formatDateTime
} from '../../shared/utils/format';
import './TaskManagementModal.css';

interface TaskManagementModalProps {
  task: Task;
  isManager: boolean;
  collaboratorOptions: Collaborator[];
  collaboratorSelection: string[];
  onToggleCollaborator: (collaboratorId: string) => void;
  onConfirmCollaborators: () => void;
  statusDraft?: { status: TaskStatus; note: string };
  statusLabels: Record<TaskStatus, string>;
  onStatusChange: (field: 'status' | 'note', value: string) => void;
  onConfirmStatus: () => void;
  resources: Resource[];
  resourceDraft?: { resourceId: string; quantity: string };
  onPrepareResource: (resourceId: string) => void;
  onResourceQuantityChange: (quantity: string) => void;
  onConfirmResource: () => void;
  documentationDraft: File[];
  onSelectDocumentation: (event: ChangeEvent<HTMLInputElement>) => void;
  onConfirmDocumentation: () => void;
  priorityLabels: Record<PriorityLevel, string>;
  actionFeedback?: string | null;
  actionError?: string | null;
  onClose: () => void;
}

const TaskManagementModal = ({
  task,
  isManager,
  collaboratorOptions,
  collaboratorSelection,
  onToggleCollaborator,
  onConfirmCollaborators,
  statusDraft,
  statusLabels,
  onStatusChange,
  onConfirmStatus,
  resources,
  resourceDraft,
  onPrepareResource,
  onResourceQuantityChange,
  onConfirmResource,
  documentationDraft,
  onSelectDocumentation,
  onConfirmDocumentation,
  priorityLabels,
  actionFeedback,
  actionError,
  onClose
}: TaskManagementModalProps) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="task-management-modal__backdrop" onClick={handleBackdropClick}>
      <div
        className="task-management-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-management-modal-title"
      >
        <header className="task-management-modal__header">
          <div>
            <span>Gestionar tarea</span>
            <h4 id="task-management-modal-title">{task.name}</h4>
            <div className="task-management-modal__info">
              <div>
                <span>Estado actual</span>
                <strong>{statusLabels[task.status]}</strong>
              </div>
              <div>
                <span>Fechas</span>
                <strong>
                  {formatDateTime(task.startDate)} → {formatDateTime(task.dueDate)}
                </strong>
              </div>
              <div>
                <span>Prioridad</span>
                <strong>{priorityLabels[task.priority]}</strong>
              </div>
            </div>
          </div>
          <button type="button" aria-label="Cerrar gestión de la tarea" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="task-management-modal__body">
          {(actionFeedback || actionError) && (
            <div
              className={`task-management-modal__alert ${
                actionError ? 'task-management-modal__alert--error' : 'task-management-modal__alert--success'
              }`}
              role={actionError ? 'alert' : 'status'}
              aria-live={actionError ? 'assertive' : 'polite'}
            >
              {actionError ?? actionFeedback}
            </div>
          )}
          {task.description && (
            <p className="task-management-modal__description">{task.description}</p>
          )}

          <div className="task-card__management task-management-modal__grid">
            {isManager && (
              <div>
                <h5>Actualizar colaboradores</h5>
                <div className="task-card__options">
                  {collaboratorOptions.map((collaborator) => (
                    <label key={collaborator.id}>
                      <input
                        type="checkbox"
                        checked={collaboratorSelection.includes(collaborator.id)}
                        onChange={() => onToggleCollaborator(collaborator.id)}
                      />
                      {collaborator.firstName} {collaborator.lastName} ({collaborator.role})
                    </label>
                  ))}
                </div>
                <button type="button" onClick={onConfirmCollaborators}>
                  Confirmar colaboradores
                </button>
              </div>
            )}

            <div>
              <h5>Actualizar estado</h5>
              <div className="task-card__status">
                <select
                  value={statusDraft?.status ?? task.status}
                  onChange={(event) => onStatusChange('status', event.target.value)}
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value} disabled={value === TaskStatus.Created}>
                      {label}
                    </option>
                  ))}
                </select>
                <textarea
                  placeholder="Describe el avance registrado"
                  value={statusDraft?.note ?? ''}
                  onChange={(event) => onStatusChange('note', event.target.value)}
                  rows={2}
                />
                <button type="button" onClick={onConfirmStatus}>
                  Confirmar actualización
                </button>
              </div>
            </div>

            {isManager && (
              <div>
                <h5>Asignar recursos</h5>
                <div className="task-card__resources-form">
                  <select
                    value={resourceDraft?.resourceId ?? ''}
                    onChange={(event) => onPrepareResource(event.target.value)}
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
                    value={resourceDraft?.quantity ?? '1'}
                    onChange={(event) => onResourceQuantityChange(event.target.value)}
                    placeholder="Cantidad"
                  />
                  <button type="button" onClick={onConfirmResource}>
                    Confirmar asignación
                  </button>
                </div>
              </div>
            )}

            <div>
              <h5>Gestionar documentación</h5>
              <div className="task-card__documents">
                <input type="file" multiple onChange={onSelectDocumentation} />
                {documentationDraft.length > 0 && (
                  <div className="task-card__pending-docs">
                    <span>Archivos seleccionados:</span>
                    <ul>
                      {documentationDraft.map((file) => (
                        <li key={`${file.name}-${file.size}-${file.lastModified}`}>
                          {file.name}
                        </li>
                      ))}
                    </ul>
                    <button type="button" onClick={onConfirmDocumentation}>
                      Confirmar carga
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <footer className="task-management-modal__footer">
          <button type="button" className="secondary" onClick={onClose}>
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );
};

export default TaskManagementModal;