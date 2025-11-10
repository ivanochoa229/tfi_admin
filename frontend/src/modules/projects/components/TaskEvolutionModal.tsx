import { MouseEvent, useEffect } from 'react';

import { Task } from '../../shared/types/project';
import './TaskEvolutionModal.css';

interface TaskEvolutionModalProps {
  task: Task;
  onClose: () => void;
}

const TaskEvolutionModal = ({ task, onClose }: TaskEvolutionModalProps) => {
  const sortedNotes = [...task.progressNotes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

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
    <div className="task-evolution-modal__backdrop" onClick={handleBackdropClick}>
      <div
        className="task-evolution-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-evolution-modal-title"
      >
        <header className="task-evolution-modal__header">
          <div>
            <span>Seguimiento de tarea</span>
            <h4 id="task-evolution-modal-title">{task.name}</h4>
          </div>
          <button type="button" aria-label="Cerrar evolución de la tarea" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="task-evolution-modal__body">
          {sortedNotes.length === 0 ? (
            <p className="task-evolution-modal__empty">
              Aún no se registraron avances para esta tarea.
            </p>
          ) : (
            <ul className="task-evolution-modal__timeline">
              {sortedNotes.map((note) => (
                <li key={note.id} className="task-evolution-modal__note">
                  <div className="task-evolution-modal__bullet" aria-hidden="true" />
                  <div>
                    <time dateTime={note.createdAt}>
                      {new Date(note.createdAt).toLocaleString()}
                    </time>
                    <p>{note.message}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <footer className="task-evolution-modal__footer">
          <button type="button" onClick={onClose}>
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );
};

export default TaskEvolutionModal;