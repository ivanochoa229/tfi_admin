import { useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';

import { useAuth } from '../../auth/AuthContext';
import { useProjectManagement } from '../../shared/context/ProjectManagementContext';
import { ProjectStatus, TaskStatus } from '../../shared/types/project';
import reportsService, {
  DelayedProjectReportItem,
  OverAssignmentReportItem,
  ProjectExpenseTimeline
} from '../../shared/services/reportsService';
import { formatDateTime } from '../../shared/utils/format';
import { getTaskStatusLabel } from '../../shared/utils/status';
import './ReportsPage.css';

const extractReportErrorMessage = (error: unknown, fallback: string) => {
  if (isAxiosError(error)) {
    const rawMessage = (error.response?.data as { message?: string | string[] } | undefined)?.message;
    if (Array.isArray(rawMessage)) {
      return rawMessage.join(' ');
    }
    if (typeof rawMessage === 'string') {
      return rawMessage;
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
};

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2
});

const ReportsPage = () => {
  const { token } = useAuth();
  const { projects, isLoading, error } = useProjectManagement();
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [overAssignmentReports, setOverAssignmentReports] = useState<OverAssignmentReportItem[]>([]);
  const [delayedProjects, setDelayedProjects] = useState<DelayedProjectReportItem[]>([]);
  const [selectedFinishedProjectId, setSelectedFinishedProjectId] = useState('');
  const [expenseTimeline, setExpenseTimeline] = useState<ProjectExpenseTimeline | null>(null);
  const [expenseTimelineError, setExpenseTimelineError] = useState<string | null>(null);
  const [expenseTimelineLoading, setExpenseTimelineLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setOverAssignmentReports([]);
      setDelayedProjects([]);
      setReportsError(null);
      setReportsLoading(false);
      return;
    }

    let isActive = true;
    const loadReports = async () => {
      setReportsLoading(true);
      setReportsError(null);
      try {
        const [overAssignedResult, delayedResult] = await Promise.allSettled([
          reportsService.getOverAssignedCollaborators(token),
          reportsService.getDelayedProjects(token)
        ]);
        if (!isActive) {
          return;
        }
        
        const partialErrors: string[] = [];

        
        if (overAssignedResult.status === 'fulfilled') {
          setOverAssignmentReports(overAssignedResult.value);
        } else {
          setOverAssignmentReports([]);
          partialErrors.push(
            extractReportErrorMessage(
              overAssignedResult.reason,
              'No fue posible cargar el reporte de sobreasignación.'
            )
          );
        }

        if (delayedResult.status === 'fulfilled') {
          setDelayedProjects(delayedResult.value);
        } else {
          setDelayedProjects([]);
          partialErrors.push(
            extractReportErrorMessage(
              delayedResult.reason,
              'No fue posible cargar el reporte de proyectos retrasados.'
            )
          );
        }

        setReportsError(partialErrors.length > 0 ? partialErrors.join(' ') : null);
      } catch (err) {
        if (!isActive) {
          return;
        }
        setReportsError(extractReportErrorMessage(err, 'No fue posible cargar los reportes.'));
        setOverAssignmentReports([]);
        setDelayedProjects([]);
      } finally {
        if (isActive) {
          setReportsLoading(false);
        }
      }
    };

    loadReports();

    return () => {
      isActive = false;
    };
  }, [token, projects]);

  const completedProjects = useMemo(
    () => projects.filter((project) => project.status === ProjectStatus.Completed),
    [projects]
  );

  useEffect(() => {
    if (!selectedFinishedProjectId && completedProjects.length > 0) {
      setSelectedFinishedProjectId(completedProjects[0].id);
      return;
    }

    if (completedProjects.length === 0 && selectedFinishedProjectId) {
      setSelectedFinishedProjectId('');
      setExpenseTimeline(null);
      setExpenseTimelineError(null);
    }
  }, [completedProjects, selectedFinishedProjectId]);

  useEffect(() => {
    if (!token || !selectedFinishedProjectId) {
      setExpenseTimeline(null);
      setExpenseTimelineError(null);
      setExpenseTimelineLoading(false);
      return;
    }

    let isMounted = true;
    const loadTimeline = async () => {
      setExpenseTimelineLoading(true);
      setExpenseTimelineError(null);
      try {
        const data = await reportsService.getProjectExpenseTimeline(token, selectedFinishedProjectId);
        if (!isMounted) {
          return;
        }
        setExpenseTimeline(data);
      } catch (timelineError) {
        if (!isMounted) {
          return;
        }
        setExpenseTimeline(null);
        setExpenseTimelineError(
          extractReportErrorMessage(
            timelineError,
            'No fue posible generar la trazabilidad de gastos para el proyecto seleccionado.'
          )
        );
      } finally {
        if (isMounted) {
          setExpenseTimelineLoading(false);
        }
      }
    };

    loadTimeline();

    return () => {
      isMounted = false;
    };
  }, [selectedFinishedProjectId, token]);

  const taskStatusByProject = useMemo(() => {
    return projects.map((project) => {
      const counts: Record<TaskStatus, number> = {
        [TaskStatus.Created]: 0,
        [TaskStatus.Pending]: 0,
        [TaskStatus.InProgress]: 0,
        [TaskStatus.InReview]: 0,
        [TaskStatus.Completed]: 0
      };

      project.tasks.forEach((task) => {
        counts[task.status] += 1;
      });

      const totalTasks = project.tasks.length || 1;

      return {
        project,
        counts,
        percentages: Object.entries(counts).map(([status, count]) => ({
          status: status as TaskStatus,
          count,
          percentage: Math.round((count / totalTasks) * 100)
        }))
      };
    });
  }, [projects]);

  const isInitialLoading =
    (isLoading && projects.length === 0) ||
    (reportsLoading &&
      overAssignmentReports.length === 0 &&
      delayedProjects.length === 0);

  if (isInitialLoading) {
    return (
      <div className="reports">
        <header className="reports__header">
          <div>
            <h2>Reportes operativos</h2>
            <p>Cargando información de los reportes...</p>
          </div>
        </header>
      </div>
    );
  }



  return (
    <div className="reports">
      <header className="reports__header">
        <div>
          <h2>Reportes operativos</h2>
          <p>Consulta indicadores clave para la gestión de proyectos y equipos.</p>
        </div>
      </header>

      {error && <div className="reports__alert">{error}</div>}
      {reportsError && <div className="reports__alert">{reportsError}</div>}

      <section className="reports__section">
        <h3>Reporte de sobreasignación de tareas</h3>
        {reportsLoading && overAssignmentReports.length === 0 ? (
          <p className="reports__empty">Evaluando asignaciones superpuestas...</p>
        ) : overAssignmentReports.length === 0 ? (
          <p className="reports__empty">No se detectaron sobreasignaciones en el periodo evaluado.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Conflictos</th>
              </tr>
            </thead>
            <tbody>
              {overAssignmentReports.map(({ collaborator, conflicts }) => (
                <tr key={`over-${collaborator.id}`}>
                  <td>
                    <strong>
                      {collaborator.firstName} {collaborator.lastName}
                    </strong>
                    <span> {collaborator.email}</span>
                  </td>
                  <td>
                    <ul>
                      {conflicts.map((conflict) => (
                        <li key={`${conflict.id}-${conflict.startDate}`}>
                          <span className={`status status--${conflict.status.toLowerCase()}`}>
                            {conflict.statusLabel}
                          </span>
                          <div>
                            <strong>{conflict.name}</strong><br />
                            <span><strong>Proyecto:</strong> {conflict.project.name}</span>
                            <small>
                              {formatDateTime(conflict.startDate)} - {formatDateTime(conflict.endDate)}
                            </small>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="reports__section">
        <h3>Reporte de proyectos atrasados</h3>
        {reportsLoading && delayedProjects.length === 0 ? (
          <p className="reports__empty">Analizando fechas estimadas...</p>
        ) : delayedProjects.length === 0 ? (
          <p className="reports__empty">No se encontraron proyectos atrasados en el sistema.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Proyecto</th>
                <th>Fecha estimada</th>
                <th>Días de atraso</th>
                <th>Tareas pendientes</th>
              </tr>
            </thead>
            <tbody>
              {delayedProjects.map((report) => (
                <tr key={report.id}>
                  <td>{report.name}</td>
                  <td>{formatDateTime(report.estimatedDate)}</td>
                  <td>{report.delayDays}</td>
                  <td>{report.pendingTasks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="reports__section">
        <h3>Reporte de avance de tareas por proyecto</h3>
        <div className="reports__grid">
          {taskStatusByProject.map(({ project, percentages }) => (
            <article key={project.id} className="reports__card">
              <header>
                <h4>{project.name}</h4>
                <span>({project.tasks.length} tareas)</span>
              </header>
              <ul>
                {percentages.map((item) => (
                  <li key={item.status}>
                    <span>{getTaskStatusLabel(item.status)}</span>
                    <div className="reports__progress">
                      <div className="reports__progress-bar">
                        <div
                          className={`reports__progress-fill status--${item.status.toLowerCase()}`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                      <strong>
                        {item.count} ({item.percentage}%)
                      </strong>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
      <section className="reports__section">
        <div className="reports__section-header">
          <h3>Trazabilidad de gastos por proyecto</h3>
          <p>Analiza cómo se acumularon los gastos a medida que las tareas finalizadas fueron cerrándose.</p>
        </div>

        {completedProjects.length === 0 ? (
          <p className="reports__empty">
            Para consultar la trazabilidad de gastos es necesario contar con al menos un proyecto finalizado.
          </p>
        ) : (
          <>
            <div className="reports__filters">
              <label className="reports__field">
                <span>Proyecto finalizado</span>
                <select
                  value={selectedFinishedProjectId}
                  onChange={(event) => setSelectedFinishedProjectId(event.target.value)}
                >
                  {completedProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
              {expenseTimeline && (
                <div className="reports__summary">
                  <strong>Total invertido:</strong>
                  <span>{currencyFormatter.format(expenseTimeline.totalExpenses)}</span>
                </div>
              )}
            </div>

            {expenseTimelineError && <div className="reports__alert">{expenseTimelineError}</div>}

            {expenseTimelineLoading ? (
              <p className="reports__empty">Calculando la trazabilidad de gastos...</p>
            ) : expenseTimeline && expenseTimeline.timeline.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Tarea</th>
                    <th>Fecha de finalización</th>
                    <th>Gasto incremental</th>
                    <th>Gasto acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {expenseTimeline.timeline.map((item) => (
                    <tr key={`${item.taskId}-${item.endDate}`}>
                      <td>
                        <strong>{item.taskName}</strong>
                      </td>
                      <td>{formatDateTime(item.endDate)}</td>
                      <td>{currencyFormatter.format(item.incrementalCost)}</td>
                      <td>{currencyFormatter.format(item.cumulativeCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="reports__empty">
                No se registraron gastos asociados a las tareas finalizadas de este proyecto.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default ReportsPage;