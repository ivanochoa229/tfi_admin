import { ProjectStatus } from '../../shared/types/project';
import './StatusBadge.css';

const STATUS_LABELS: Record<ProjectStatus, string> = {
  [ProjectStatus.Planned]: 'Planificado',
  [ProjectStatus.InProgress]: 'En progreso',
  [ProjectStatus.Completed]: 'Completado',
  [ProjectStatus.OnHold]: 'En pausa'
};

const StatusBadge = ({ status }: { status: ProjectStatus }) => (
  <span className={`status-badge status-badge--${status.toLowerCase().replace(/\s/g, '-')}`}>
    {STATUS_LABELS[status]}
  </span>
);

export default StatusBadge;