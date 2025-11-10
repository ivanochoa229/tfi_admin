import { useMemo } from 'react';

import { useAuth } from '../../auth/AuthContext';
import { isManagerRole } from '../../shared/utils/roles';
import ProjectSummary from '../../projects/components/ProjectSummary';
import { useProjectManagement } from '../../shared/context/ProjectManagementContext';
import { getProjectsVisibleToUser } from '../../shared/utils/access';
import StatsCard from '../components/StatsCard';
import './DashboardPage.css';

const DashboardPage = () => {
  const { projects, isLoading, error } = useProjectManagement();
  const { user } = useAuth();

  const visibleProjects = useMemo(() => getProjectsVisibleToUser(projects, user), [projects, user]);

  const { totalBudget, usedBudget } = useMemo(() => {
    const budget = visibleProjects.reduce((acc, project) => acc + project.budget, 0);
    const used = visibleProjects.reduce((acc, project) => acc + project.usedBudget, 0);

    return {
      totalBudget: budget,
      usedBudget: used
    };
  }, [visibleProjects]);

  const isManager = isManagerRole(user?.roleName);

  const availableBudget = useMemo(() => {
    const remaining = totalBudget - usedBudget;
    return remaining > 0 ? remaining : 0;
  }, [totalBudget, usedBudget]);

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
      {isManager && (
        <section className="dashboard-page__section">
          <h2>Resumen general</h2>
          <div className="dashboard-page__stats">
            <StatsCard
              title="Presupuesto ocupado"
              value={`USD ${usedBudget.toLocaleString()}`}
              trend={`Sobre un total de USD ${totalBudget.toLocaleString()}`}
            />
            <StatsCard
              title="Presupuesto disponible"
              value={`USD ${availableBudget.toLocaleString()}`}
              trend="Calculado según los proyectos visibles"
            />
          </div>
        </section>
      )}

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