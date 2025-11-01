import { Link } from 'react-router-dom';

import { useMemo } from 'react';

import { useProjectManagement } from '../../shared/context/ProjectManagementContext';
import { Project } from '../../shared/types/project';
import { formatCurrency, getCollaboratorFullName } from '../../shared/utils/format';
import StatusBadge from './StatusBadge';
import './ProjectSummary.css';

interface ProjectSummaryProps {
  project: Project;
}

const ProjectSummary = ({ project }: ProjectSummaryProps) => {
  const { collaborators } = useProjectManagement();
  const managerName = useMemo(
    () => getCollaboratorFullName(collaborators, project.managerId),
    [collaborators, project.managerId]
  );

  return (
    <article className="project-summary">
      <header>
        <h3>{project.name}</h3>
        <StatusBadge status={project.status} />
      </header>
      <p className="project-summary__description">{project.description}</p>
      <div className="project-summary__progress">
        <span>Avance</span>
        <div className="progress-bar">
          <div className="progress-bar__fill" style={{ width: `${project.progress}%` }} />
        </div>
        <span className="project-summary__progress-value">{project.progress}%</span>
      </div>
      <div className="project-summary__budget">
        <span>Presupuesto utilizado</span>
        <strong>
          {formatCurrency(project.usedBudget)} / {formatCurrency(project.budget)}
        </strong>
      </div>
      <footer>
        <div>
          <strong>Gestor:</strong> {managerName}
        </div>
        <Link to={`/projects/${project.id}`} className="link">
          Ver detalle
        </Link>
      </footer>
    </article>
  );
};

export default ProjectSummary;