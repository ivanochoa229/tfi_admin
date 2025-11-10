import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskProject } from '../../database/entities/task-project.entity';
import { Project } from '../../database/entities/project.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(TaskProject)
    private readonly taskProjectRepository: Repository<TaskProject>,
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>
  ) {}

  async getCollaboratorsWithMultipleTasks() {
    const assignments = await this.taskProjectRepository.find({
      relations: ['employee', 'project', 'task', 'task.state']
    });

    const grouped = new Map<string, { employee: any; tasks: any[] }>();

    for (const assignment of assignments) {
      if (!assignment.employee) continue;
      const key = assignment.employee.id;
      if (!grouped.has(key)) {
        grouped.set(key, {
          employee: {
            id: assignment.employee.id,
            firstName: assignment.employee.firstName,
            lastName: assignment.employee.lastName,
            email: assignment.employee.email
          },
          tasks: []
        });
      }
      grouped.get(key)?.tasks.push({
        taskId: assignment.task.id,
        name: assignment.task.name,
        description: assignment.task.description ?? null,
        state: assignment.task.state.description,
        project: {
          id: assignment.project.id,
          name: assignment.project.name
        }
      });
    }

    return Array.from(grouped.values()).filter((item) => item.tasks.length > 1);
  }

  async getOverAssignedCollaborators() {
    const assignments = await this.taskProjectRepository.find({
      relations: ['employee', 'project', 'task', 'task.state']
    });

    const assignmentsByEmployee = new Map<
      string,
      {
        employee: {
          id: string;
          firstName: string;
          lastName: string;
          email: string;
        };
        tasks: Array<{
          id: string;
          name: string;
          description: string | null;
          state: string;
          project: { id: string; name: string };
          startDate: Date;
          endDate: Date;
          startLabel: string;
          endLabel: string;
        }>;
      }
    >();

    const toDate = (value?: string | Date | null) => {
      if (!value) {
        return null;
      }

      if (value instanceof Date) {
        return value;
      }

      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    assignments.forEach((assignment) => {
      const employee = assignment.employee;
      const task = assignment.task;
      if (!employee || !task?.state) {
        return;
      }

      const rawStart = task.startDate ?? task.estimatedDate ?? task.endDate;
      const rawEnd = task.endDate ?? task.estimatedDate ?? task.startDate;
      const startDate = toDate(rawStart);
      const endDate = toDate(rawEnd);

      if (!startDate || !endDate) {
        return;
      }

      const rangeStart = startDate <= endDate ? startDate : endDate;
      const rangeEnd = startDate <= endDate ? endDate : startDate;
      const startLabel = rangeStart.toISOString();
      const endLabel = rangeEnd.toISOString();

      const key = employee.id;
      if (!assignmentsByEmployee.has(key)) {
        assignmentsByEmployee.set(key, {
          employee: {
            id: employee.id,
            firstName: employee.firstName,
            lastName: employee.lastName,
            email: employee.email ?? ''
          },
          tasks: []
        });
      }

      const entry = assignmentsByEmployee.get(key);
      const alreadyRegistered = entry?.tasks.some((item) => item.id === task.id);
      if (entry && !alreadyRegistered) {
        entry.tasks.push({
          id: task.id,
          name: task.name,
          description: task.description ?? null,
          state: task.state.description,
          project: {
            id: assignment.project.id,
            name: assignment.project.name
          },
          startDate: rangeStart,
          endDate: rangeEnd,
          startLabel,
          endLabel
        });
      }
    });

    const result: Array<{
      employee: { id: string; firstName: string; lastName: string; email: string };
      tasks: Array<{
        taskId: string;
        name: string;
        description: string;
        state: string;
        project: { id: string; name: string };
        startDate: string;
        endDate: string;
      }>;
    }> = [];

    assignmentsByEmployee.forEach((entry) => {
      const overlapIds = new Set<string>();
      const tasks = entry.tasks;
      for (let i = 0; i < tasks.length; i += 1) {
        for (let j = i + 1; j < tasks.length; j += 1) {
          const first = tasks[i];
          const second = tasks[j];
          const overlap =
            first.startDate <= second.endDate && second.startDate <= first.endDate;
          if (overlap) {
            overlapIds.add(first.id);
            overlapIds.add(second.id);
          }
        }
      }

      if (overlapIds.size > 0) {
        const overlappingTasks = tasks
          .filter((task) => overlapIds.has(task.id))
          .sort((a, b) => a.startLabel.localeCompare(b.startLabel))
          .map((task) => ({
            taskId: task.id,
            name: (task.name ?? '').toString(),
            description: (task.description ?? task.name ?? '').toString(),
            state: task.state,
            project: task.project,
            startDate: task.startLabel,
            endDate: task.endLabel
          }));

        result.push({
          employee: entry.employee,
          tasks: overlappingTasks
        });
      }
    });

    return result;
  }

  async getDelayedProjects() {
    const projects = await this.projectsRepository.find({
      relations: ['taskAssignments', 'taskAssignments.task', 'taskAssignments.task.state']
    });

    const today = new Date();
    return projects
      .map((project) => {
        const estimated = new Date(project.estimatedDate);
        const finished = project.endDate ? new Date(project.endDate) : null;
        const referenceDate = finished ?? today;
        const diffMs = referenceDate.getTime() - estimated.getTime();
        const delayDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const uniqueTasks = new Map<string, { completed: boolean }>();
        project.taskAssignments?.forEach((assignment) => {
          uniqueTasks.set(assignment.task.id, {
            completed: assignment.task.state.description === 'COMPLETADA'
          });
        });
        const pendingTasks = Array.from(uniqueTasks.values()).filter((task) => !task.completed)
          .length;
        return {
          id: project.id,
          name: project.name,
          estimatedDate: project.estimatedDate,
          delayDays,
          pendingTasks
        };
      })
      .filter((project) => project.delayDays > 0);
  }

  async getProjectProgress(projectId: string) {
    const project = await this.projectsRepository.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    const assignments = await this.taskProjectRepository.find({
      where: { project: { id: projectId } },
      relations: ['task', 'task.state']
    });

    const uniqueTasks = new Map<string, string>();
    assignments.forEach((assignment) => {
      uniqueTasks.set(assignment.task.id, assignment.task.state.description);
    });

    const totalTasks = uniqueTasks.size;
    const stateCounters: Record<string, number> = {};
    uniqueTasks.forEach((state) => {
      stateCounters[state] = (stateCounters[state] ?? 0) + 1;
    });

    const result = Object.entries(stateCounters).map(([state, count]) => ({
      state,
      count,
      percentage: totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0
    }));

    return {
      project: { id: project.id, name: project.name },
      totalTasks,
      states: result
    };
  }
}