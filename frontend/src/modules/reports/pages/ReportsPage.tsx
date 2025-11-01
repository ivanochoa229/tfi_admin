import { useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';

import { useAuth } from '../../auth/AuthContext';
import { useProjectManagement } from '../../shared/context/ProjectManagementContext';
import { TaskStatus } from '../../shared/types/project';
import reportsService, {
  CollaboratorTaskReportItem,
  DelayedProjectReportItem,
  OverAssignmentReportItem
} from '../../shared/services/reportsService';
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

const ReportsPage = () => {
  const { token } = useAuth();
  const { projects, isLoading, error } = useProjectManagement();
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [collaboratorReports, setCollaboratorReports] = useState<CollaboratorTaskReportItem[]>([]);
  const [overAssignmentReports, setOverAssignmentReports] = useState<OverAssignmentReportItem[]>([]);
  const [delayedProjects, setDelayedProjects] = useState<DelayedProjectReportItem[]>([]);

  useEffect(() => {
    if (!token) {
      setCollaboratorReports([]);
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
        const [multipleTasksResult, overAssignedResult, delayedResult] = await Promise.allSettled([
          reportsService.getCollaboratorsWithMultipleTasks(token),
          reportsService.getOverAssignedCollaborators(token),
          reportsService.getDelayedProjects(token)
        ]);
        if (!isActive) {
          return;
        }
        
        const partialErrors: string[] = [];

        if (multipleTasksResult.status === 'fulfilled') {
          setCollaboratorReports(multipleTasksResult.value);
        } else {
          setCollaboratorReports([]);
          partialErrors.push(
            extractReportErrorMessage(
              multipleTasksResult.reason,
              'No fue posible cargar el reporte de colaboradores con múltiples tareas.'
            )
          );
        }

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
        setCollaboratorReports([]);
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


  const taskStatusByProject = useMemo(() => {
    return projects.map((project) => {
      const counts: Record<TaskStatus, number> = {
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
      collaboratorReports.length === 0 &&
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
        <h3>Reporte de colaboradores con múltiples tareas</h3>
        {reportsLoading && collaboratorReports.length === 0 ? (
          <p className="reports__empty">Cargando colaboradores desde el backend...</p>
        ) : collaboratorReports.length === 0 ? (
          <p className="reports__empty">No existen colaboradores con más de una tarea asignada.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Tareas asignadas</th>
              </tr>
            </thead>
            <tbody>
              {collaboratorReports.map(({ collaborator, tasks }) => (
                <tr key={collaborator.id}>
                  <td>
                    <strong>
                      {collaborator.firstName} {collaborator.lastName}
                    </strong>
                    <span>{collaborator.email}</span>
                  </td>
                  <td>
                    <ul>
                      {tasks.map((task) => (
                        <li key={task.id}>
                          <span className={`status status--${task.status.toLowerCase()}`}>
                            {task.statusLabel}
                          </span>
                          <div>
                            <strong>{task.name}</strong>
                            <span>{task.project.name}</span>
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
                    <span>{collaborator.email}</span>
                  </td>
                  <td>
                    <ul>
                      {conflicts.map((conflict) => (
                        <li key={`${conflict.id}-${conflict.startDate}`}>
                          <span className={`status status--${conflict.status.toLowerCase()}`}>
                            {conflict.statusLabel}
                          </span>
                          <div>
                            <strong>{conflict.name}</strong>
                            <span>{conflict.project.name}</span>
                            <small>
                              {new Date(conflict.startDate).toLocaleDateString()} -
                              {' '}
                              {new Date(conflict.endDate).toLocaleDateString()}
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
                  <td>{new Date(report.estimatedDate).toLocaleDateString()}</td>
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
    </div>
  );
};

export default ReportsPage;