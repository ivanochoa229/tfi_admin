import { User } from '../../auth/AuthContext';
import { Project, Task } from '../types/project';

export const canUserAccessProject = (project: Project, user: User | null): boolean => {
  if (!user) {
    return false;
  }

  if (user.role === 'Gestor de proyecto') {
    return true;
  }

  return (
    project.teamIds.includes(user.id) ||
    project.tasks.some((task) => task.assigneeIds.includes(user.id))
  );
};

export const getProjectsVisibleToUser = (projects: Project[], user: User | null): Project[] => {
  if (!user) {
    return [];
  }

  if (user.role === 'Gestor de proyecto') {
    return projects;
  }

  return projects.filter((project) => canUserAccessProject(project, user));
};

export const getTasksVisibleToUser = (project: Project, user: User | null): Task[] => {
  if (!user) {
    return [];
  }

  if (user.role === 'Gestor de proyecto') {
    return project.tasks;
  }

  return project.tasks.filter((task) => task.assigneeIds.includes(user.id));
};