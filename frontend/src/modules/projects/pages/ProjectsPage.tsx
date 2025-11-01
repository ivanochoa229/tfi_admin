import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../../auth/AuthContext';
import { useProjectManagement } from '../../shared/context/ProjectManagementContext';
import { PriorityLevel } from '../../shared/types/project';
import { getProjectsVisibleToUser } from '../../shared/utils/access';
import { formatCurrency, getCollaboratorFullName } from '../../shared/utils/format';
import StatusBadge from '../components/StatusBadge';
import './ProjectsPage.css';

const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  [PriorityLevel.Low]: 'Baja',
  [PriorityLevel.Medium]: 'Media',
  [PriorityLevel.High]: 'Alta'
};

const ProjectsPage = () => {
  const { projects, collaborators, isLoading, error } = useProjectManagement();
  const { user } = useAuth();
  const isManager = user?.role === 'Gestor de proyecto';
  const headerTitle = isManager ? 'Proyectos' : 'Mis proyectos';
  const headerDescription = isManager
    ? 'Consulta el estado y los responsables de cada iniciativa.'
    : 'Visualiza el estado de los proyectos en los que participas.';
  const visibleProjects = useMemo(() => getProjectsVisibleToUser(projects, user), [projects, user]);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProjects = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return visibleProjects.filter((project) =>
      [
        project.name,
        project.description,
        getCollaboratorFullName(collaborators, project.managerId),
        PRIORITY_LABELS[project.priority]
      ]
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [visibleProjects, searchTerm, collaborators]);

  return (
    <div className="projects-page">
      <header className="projects-page__header">
        <div>
          <h2>{headerTitle}</h2>
          <p>{headerDescription}</p>
        </div>
        <div className="projects-page__actions">
          <input
            type="search"
            placeholder="Buscar por nombre, descripción, gestor o prioridad"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          {isManager && (
            <Link to="/projects/new" className="button">
              Crear proyecto
            </Link>
          )}
        </div>
      </header>

      <div className="projects-table__wrapper">
        {error && <div className="projects-page__alert">{error}</div>}
        {isLoading && projects.length === 0 ? (
          <p>Cargando proyectos...</p>
        ) : (
        <table className="projects-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Estado</th>
              <th>Avance</th>
              <th>Gestor</th>
              <th>Prioridad</th>
              <th>Presupuesto</th>
              <th>Fechas</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.map((project) => (
              <tr key={project.id}>
                <td>
                  <strong>{project.name}</strong>
                  <p>{project.description}</p>
                </td>
                <td>
                  <StatusBadge status={project.status} />
                </td>
                <td>
                  <div className="projects-table__progress">
                    <div className="progress-bar">
                      <div className="progress-bar__fill" style={{ width: `${project.progress}%` }} />
                    </div>
                    <span>{project.progress}%</span>
                  </div>
                </td>
                <td>{getCollaboratorFullName(collaborators, project.managerId)}</td>
                <td>{PRIORITY_LABELS[project.priority]}</td>
                <td>
                  <strong>{formatCurrency(project.usedBudget)}</strong>
                  <span className="projects-table__budget">de {formatCurrency(project.budget)}</span>
                </td>
                <td>
                  <span>{new Date(project.startDate).toLocaleDateString()}</span>
                  <span>{new Date(project.endDate).toLocaleDateString()}</span>
                </td>
                <td>
                  <Link to={`/projects/${project.id}`} className="link">
                    Ver más
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
};

export default ProjectsPage;