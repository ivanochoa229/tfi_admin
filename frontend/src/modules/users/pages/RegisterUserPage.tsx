import { FormEvent, useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useProjectManagement } from '../../shared/context/ProjectManagementContext';
import { CollaboratorRole } from '../../shared/types/project';
import './RegisterUserPage.css';
import useDismissOnInteraction from '../../shared/hooks/useDismissOnInteraction';

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: CollaboratorRole;
};

const DEFAULT_STATE: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  role: 'Colaborador'
};

const ROLE_OPTIONS: CollaboratorRole[] = ['Colaborador'];
const SUMMARY_ROLES: CollaboratorRole[] = ['Gestor de proyecto', 'Colaborador'];

const RegisterUserPage = () => {
  const navigate = useNavigate();
  const { registerCollaborator, collaborators } = useProjectManagement();
  const [form, setForm] = useState<FormState>(DEFAULT_STATE);
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

  const totalByRole = useMemo(
    () =>
      collaborators.reduce<Record<CollaboratorRole, number>>(
        (acc, collaborator) => ({
          ...acc,
          [collaborator.role]: acc[collaborator.role] + 1
        }),
        { 'Gestor de proyecto': 0, Colaborador: 0 }
      ),
    [collaborators]
  );

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setPendingConfirmation(form);
  };

  const handleConfirm = async () => {
    if (!pendingConfirmation) {
      return;
    }

    setIsSubmitting(true);
    try {
      const collaborator = await registerCollaborator(pendingConfirmation);
      setSuccessMessage(`Usuario ${collaborator.firstName} ${collaborator.lastName} creado correctamente.`);
      setPendingConfirmation(null);
      setForm(DEFAULT_STATE);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('No se pudo registrar el usuario.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="register-user">
      <header className="register-user__header">
        <div>
          <h2>Registrar nuevo usuario</h2>
          <p>Los usuarios creados podrán autenticarse según el rol asignado.</p>
        </div>
        <button type="button" className="link" onClick={() => navigate(-1)}>
          Volver
        </button>
      </header>

      <form className="register-user__form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label>
            Nombre
            <input name="firstName" value={form.firstName} onChange={handleChange} required />
          </label>
          <label>
            Apellido
            <input name="lastName" value={form.lastName} onChange={handleChange} required />
          </label>
        </div>
        <div className="form-row">
          <label>
            Correo electrónico
            <input type="email" name="email" value={form.email} onChange={handleChange} required />
          </label>
          <label>
            Teléfono de contacto
            <input name="phone" value={form.phone} onChange={handleChange} required />
          </label>
        </div>
        <label>
          Contraseña temporal
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            minLength={6}
            placeholder="Mínimo 6 caracteres"
          />
          <span className="register-user__hint">Comparte esta contraseña con el colaborador y pídele que la actualice en su primer ingreso.</span>
        </label>
        <label>
          Rol del usuario
          <select name="role" value={form.role} onChange={handleChange} required disabled>
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <span className="register-user__hint">Los gestores solo pueden crear cuentas de colaboradores.</span>
        </label>
        <div className="register-user__actions">
          <button type="submit" disabled={isSubmitting}>
            Validar datos
          </button>
        </div>
      </form>

      {error && <div className="register-user__alert register-user__alert--error">{error}</div>}
      {successMessage && <div className="register-user__alert register-user__alert--success">{successMessage}</div>}

      {pendingConfirmation && (
        <section className="register-user__confirmation">
          <h3>Confirma el registro</h3>
          <ul>
            <li>
              <strong>Nombre:</strong> {pendingConfirmation.firstName} {pendingConfirmation.lastName}
            </li>
            <li>
              <strong>Email:</strong> {pendingConfirmation.email}
            </li>
            <li>
              <strong>Teléfono:</strong> {pendingConfirmation.phone}
            </li>
            <li>
              <strong>Rol:</strong> {pendingConfirmation.role}
            </li>
            <li>
              <strong>Contraseña temporal:</strong> {'•'.repeat(pendingConfirmation.password.length)}
            </li>
          </ul>
          <div className="register-user__actions">
            <button type="button" className="secondary" onClick={() => setPendingConfirmation(null)}>
              Editar
            </button>
            <button type="button" onClick={handleConfirm} disabled={isSubmitting}>
              Confirmar creación
            </button>
          </div>
        </section>
      )}

      <section className="register-user__summary">
        <h3>Usuarios registrados</h3>
        <div className="register-user__summary-grid">
          {SUMMARY_ROLES.map((role) => (
            <article key={role}>
              <h4>{role}</h4>
              <span>{totalByRole[role]}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default RegisterUserPage;