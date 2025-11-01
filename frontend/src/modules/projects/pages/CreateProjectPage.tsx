import { FormEvent, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { PriorityLevel } from '../../shared/types/project';
import { useProjectManagement } from '../../shared/context/ProjectManagementContext';
import './CreateProjectPage.css';
import useDismissOnInteraction from '../../shared/hooks/useDismissOnInteraction';

type FormState = {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  budget: string;
  priority: PriorityLevel;
};

const DEFAULT_FORM: FormState = {
  name: '',
  description: '',
  startDate: '',
  endDate: '',
  budget: '',
  priority: PriorityLevel.Medium
};

const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  [PriorityLevel.Low]: 'Baja',
  [PriorityLevel.Medium]: 'Media',
  [PriorityLevel.High]: 'Alta'
};

const CreateProjectPage = () => {
  const navigate = useNavigate();
  const { createProject } = useProjectManagement();

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<FormState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearFeedback = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  const hasFeedback = Boolean(error || successMessage);
  useDismissOnInteraction(hasFeedback, clearFeedback);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const parsedBudget = Number(form.budget);

    if (!Number.isFinite(parsedBudget)) {
      setError('El presupuesto debe ser un número válido.');
      return;
    }

    setPendingConfirmation({ ...form, budget: String(parsedBudget) });
  };

  const handleConfirmCreation = async () => {
    if (!pendingConfirmation) {
      return;
    }

    setIsSubmitting(true);
    try {
      const createdProject = await createProject({
        name: pendingConfirmation.name,
        description: pendingConfirmation.description,
        startDate: pendingConfirmation.startDate,
        endDate: pendingConfirmation.endDate,
        budget: Number(pendingConfirmation.budget),
        priority: pendingConfirmation.priority
      });

      setSuccessMessage(`Proyecto "${createdProject.name}" creado correctamente.`);
      setPendingConfirmation(null);
      setForm(DEFAULT_FORM);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('No se pudo crear el proyecto. Intenta nuevamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelConfirmation = () => {
    setPendingConfirmation(null);
  };

  return (
    <div className="create-project">
      <header className="create-project__header">
        <div>
          <h2>Crear nuevo proyecto</h2>
          <p>Completa los datos requeridos para registrar una nueva iniciativa.</p>
        </div>
        <button type="button" className="link" onClick={() => navigate('/projects')}>
          Volver al listado
        </button>
      </header>

      <form className="create-project__form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            Nombre del proyecto
            <input name="name" value={form.name} onChange={handleChange} placeholder="Implementación CRM" required />
          </label>
          <label>
            Fecha de inicio
            <input type="date" name="startDate" value={form.startDate} onChange={handleChange} required />
          </label>
          <label>
            Fecha estimada de finalización
            <input type="date" name="endDate" value={form.endDate} onChange={handleChange} required />
          </label>
          <label>
            Presupuesto total (USD)
            <input
              name="budget"
              type="number"
              min={0}
              step={1000}
              value={form.budget}
              onChange={handleChange}
              placeholder="50000"
              required
            />
          </label>
          <label>
            Prioridad
            <select name="priority" value={form.priority} onChange={handleChange} required>
              {Object.entries(PRIORITY_LABELS).map(([priority, label]) => (
                <option key={priority} value={priority}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="form-full">
          Descripción
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Describe el objetivo principal, alcance y beneficios esperados."
            required
            rows={4}
          />
        </label>
        <div className="create-project__actions">
          <button type="submit" disabled={isSubmitting}>
            Validar datos
          </button>
        </div>
      </form>

      {error && <div className="create-project__alert create-project__alert--error">{error}</div>}
      {successMessage && <div className="create-project__alert create-project__alert--success">{successMessage}</div>}

      {pendingConfirmation && (
        <section className="create-project__confirmation">
          <h3>Confirma la creación</h3>
          <p>Revisa la información antes de continuar.</p>
          <ul>
            <li>
              <strong>Nombre:</strong> {pendingConfirmation.name}
            </li>
            <li>
              <strong>Fechas:</strong> {pendingConfirmation.startDate} → {pendingConfirmation.endDate}
            </li>
            <li>
              <strong>Presupuesto:</strong> USD {Number(pendingConfirmation.budget).toLocaleString()}
            </li>
            <li>
              <strong>Prioridad:</strong> {PRIORITY_LABELS[pendingConfirmation.priority]}
            </li>
            <li>
              <strong>Descripción:</strong> {pendingConfirmation.description}
            </li>
          </ul>
          <div className="create-project__actions">
            <button type="button" className="secondary" onClick={handleCancelConfirmation}>
              Editar
            </button>
                <button type="button" onClick={handleConfirmCreation} disabled={isSubmitting}>
                  Confirmar creación
                </button>
          </div>
        </section>
      )}
    </div>
  );
};

export default CreateProjectPage;