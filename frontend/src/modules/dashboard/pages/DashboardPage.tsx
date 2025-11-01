import { useMemo } from 'react';

import { useAuth } from '../../auth/AuthContext';
import ProjectSummary from '../../projects/components/ProjectSummary';
import { useProjectManagement } from '../../shared/context/ProjectManagementContext';
import { ProjectStatus } from '../../shared/types/project';
import { getProjectsVisibleToUser } from '../../shared/utils/access';
import StatsCard from '../components/StatsCard';
import './DashboardPage.css';

const DashboardPage = () => {
  const { projects, isLoading, error } = useProjectManagement();
  const { user } = useAuth();

  const visibleProjects = useMemo(() => getProjectsVisibleToUser(projects, user), [projects, user]);

  const { totalProjects, completedProjects, activeProjects, averageProgress, totalBudget, usedBudget } = useMemo(() => {
    const total = visibleProjects.length;
    const completed = visibleProjects.filter((project) => project.status === ProjectStatus.Completed).length;
    const active = visibleProjects.filter((project) => project.status !== ProjectStatus.Completed).length;
    const progress = total
      ? Math.round(visibleProjects.reduce((acc, project) => acc + project.progress, 0) / total)
      : 0;
    const budget = visibleProjects.reduce((acc, project) => acc + project.budget, 0);
    const used = visibleProjects.reduce((acc, project) => acc + project.usedBudget, 0);

    return {
      totalProjects: total,
      completedProjects: completed,
      activeProjects: active,
      averageProgress: progress,
      totalBudget: budget,
      usedBudget: used
    };
  }, [visibleProjects]);

  if (isLoading && projects.length === 0) {
    return (
      <div className="dashboard-page">
        <section className="dashboard-page__section">
          <p>Cargando datos del panel...</p>
        </section>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {error && (
        <section className="dashboard-page__section">
          <div className="dashboard-page__alert">{error}</div>
        </section>
      )}
      <section className="dashboard-page__section">
        <h2>Resumen general</h2>
        <div className="dashboard-page__stats">
          <StatsCard title="Proyectos totales" value={totalProjects} trend="+2 respecto al mes pasado" />
          <StatsCard
            title="Proyectos activos"
            value={activeProjects}
            trend="Incluye proyectos planificados y en progreso"
          />
          <StatsCard title="Completados" value={completedProjects} trend="Objetivo trimestral 80%" />
          <StatsCard title="Avance promedio" value={`${averageProgress}%`} trend="Promedio ponderado" />
          <StatsCard
            title="Uso de presupuesto"
            value={`USD ${usedBudget.toLocaleString()} / USD ${totalBudget.toLocaleString()}`}
            trend="Suma total de proyectos"
          />
        </div>
      </section>

      <section className="dashboard-page__section">
        <header className="dashboard-page__section-header">
          <div>
            <h2>Proyectos destacados</h2>
            <p>Una vista rápida del estado de los proyectos en curso.</p>
          </div>
        </header>
        <div className="dashboard-page__projects-grid">
          {visibleProjects.map((project) => (
            <ProjectSummary key={project.id} project={project} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;