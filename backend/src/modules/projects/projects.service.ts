import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, FindOptionsRelations, FindOptionsWhere, IsNull } from 'typeorm';
import { Project } from '../../database/entities/project.entity';
import { Priority } from '../../database/entities/priority.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { Task } from '../../database/entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskState } from '../../database/entities/task-state.entity';
import { TaskProject } from '../../database/entities/task-project.entity';
import { ProjectAssignment } from '../../database/entities/project-assignment.entity';
import { AssignCollaboratorsDto } from './dto/assign-collaborators.dto';
import { Employee } from '../../database/entities/employee.entity';
import { AssignResourceDto } from './dto/assign-resource.dto';
import { Resource } from '../../database/entities/resource.entity';
import { TaskProjectResource } from '../../database/entities/task-project-resource.entity';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { TaskEvolution } from '../../database/entities/task-evolution.entity';

type AllowedRole = AuthenticatedUser['roleName'];

const normalizeStateName = (value: string) =>
  value
    ?.normalize('NFD')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

const TASK_STATE_TRANSITIONS: Record<
  string,
  Record<
    string,
    {
      allowedRoles: AllowedRole[];
      requiresAssignment?: boolean;
    }
  >
> = {
  CREADA: {
    PENDIENTE: { allowedRoles: ['COLABORADOR'], requiresAssignment: true }
  },
  PENDIENTE: {
    'EN CURSO': { allowedRoles: ['COLABORADOR'], requiresAssignment: true }
  },
  'EN CURSO': {
    'EN REVISION': { allowedRoles: ['COLABORADOR'], requiresAssignment: true }
  },
  'EN REVISION': {
    'EN CURSO': { allowedRoles: ['GESTOR'] },
    COMPLETADA: { allowedRoles: ['GESTOR'] }
  }
};

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(Priority)
    private readonly prioritiesRepository: Repository<Priority>,
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectRepository(TaskState)
    private readonly taskStatesRepository: Repository<TaskState>,
    @InjectRepository(TaskProject)
    private readonly taskProjectRepository: Repository<TaskProject>,
    @InjectRepository(ProjectAssignment)
    private readonly projectAssignmentRepository: Repository<ProjectAssignment>,
    @InjectRepository(Employee)
    private readonly employeesRepository: Repository<Employee>,
    @InjectRepository(Resource)
    private readonly resourcesRepository: Repository<Resource>,
    @InjectRepository(TaskProjectResource)
    private readonly taskProjectResourceRepository: Repository<TaskProjectResource>,
    @InjectRepository(TaskEvolution)
    private readonly taskEvolutionRepository: Repository<TaskEvolution>
  ) {}

  async createProject(dto: CreateProjectDto, user: AuthenticatedUser): Promise<Project> {
    const priority = await this.prioritiesRepository.findOne({ where: { id: dto.priorityId } });
    if (!priority) {
      throw new NotFoundException('La prioridad seleccionada no existe');
    }

    const project = this.projectsRepository.create({
      name: dto.name,
      description: dto.description,
      startDate: dto.startDate,
      estimatedDate: dto.estimatedDate,
      endDate: dto.endDate,
      budget: dto.budget.toString(),
      priority
    });

    const savedProject = await this.projectsRepository.save(project);

    const manager = await this.employeesRepository.findOne({ where: { id: user.id } });
    if (!manager) {
      throw new NotFoundException('No se encontró el gestor responsable del proyecto');
    }

    const assignment = this.projectAssignmentRepository.create({
      project: savedProject,
      employee: manager
    });
    await this.projectAssignmentRepository.save(assignment);

    savedProject.collaborators = [...(savedProject.collaborators ?? []), assignment];

    return savedProject;
  }

  async findAllForUser(user: AuthenticatedUser): Promise<Project[]> {
    const relations: FindOptionsRelations<Project> = {
      priority: true,
      taskAssignments: {
        task: {
          priority: true,
          state: true,
          documents: true,
          evolutions: true
        },
        employee: true
      },
      collaborators: { employee: true },
      resources: {
        resource: true,
        task: {
          priority: true,
          state: true,
          documents: true,
          evolutions: true
        }
      }
    };
   let whereClause: FindOptionsWhere<Project> | undefined;

    if (user.roleName === 'GESTOR' || user.roleName === 'COLABORADOR') {
      const assignments = await this.projectAssignmentRepository.find({
        where: { employee: { id: user.id } },
        relations: ['project'],
        loadEagerRelations: false
      });

      const projectIds = Array.from(
        new Set(
          assignments
            .map((assignment) => assignment.project?.id)
            .filter((id): id is string => typeof id === 'string')
        )
      );

      if (projectIds.length === 0) {
        return [];
      }

      whereClause = { id: In(projectIds) };
    }
  
    const projects = await this.projectsRepository.find({
      ...(whereClause ? { where: whereClause } : {}),
      relations,
      order: { startDate: 'DESC' }
    });

    projects.forEach((project) => {
      project.taskAssignments = (project.taskAssignments ?? []).filter(
        (assignment) => assignment.employee?.id === user.id
      );
    });
    if (user.roleName === 'COLABORADOR') {
      projects.forEach((project) => {
        project.taskAssignments = (project.taskAssignments ?? []).filter(
          (assignment) => assignment.employee?.id === user.id
        );
      });
    }

    return projects;
  }

  async findProjectDetail(projectId: string, user: AuthenticatedUser): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
      relations: {
        priority: true,
        taskAssignments: {
          task: {
            priority: true,
            state: true,
            documents: true,
            evolutions: true
          },
          employee: true
        },
        collaborators: { employee: true },
        resources: {
          resource: true,
          task: {
            priority: true,
            state: true,
            documents: true,
            evolutions: true
          }
        }
      }
    });

    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    if (user.roleName === 'COLABORADOR') {
      const hasAccess = await this.projectAssignmentRepository.exist({
        where: { project: { id: projectId }, employee: { id: user.id } }
      });
      if (!hasAccess) {
        throw new ForbiddenException('No tienes acceso a este proyecto');
      }
    }

    return project;
  }

  private async ensureProjectAccess(projectId: string, user: AuthenticatedUser) {
    if (user.roleName === 'GESTOR') {
      return;
    }
    const assignment = await this.projectAssignmentRepository.findOne({
      where: { project: { id: projectId }, employee: { id: user.id } }
    });
    if (!assignment) {
      throw new ForbiddenException('No tienes acceso a este proyecto');
    }
  }

  async createTask(projectId: string, dto: CreateTaskDto, user: AuthenticatedUser): Promise<Task> {
    if (user.roleName !== 'GESTOR') {
      throw new ForbiddenException('Solo un gestor puede crear tareas');
    }

    const project = await this.projectsRepository.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    const priority = await this.prioritiesRepository.findOne({ where: { id: dto.priorityId } });
    if (!priority) {
      throw new NotFoundException('La prioridad indicada no existe');
    }

    let state: TaskState | null;
    if (dto.stateId) {
      state = await this.taskStatesRepository.findOne({ where: { id: dto.stateId } });
      if (!state) {
        throw new NotFoundException('El estado indicado no existe');
      }
    } else {
      state = await this.taskStatesRepository.findOne({ where: { description: 'CREADA' } });
      if (!state) {
        throw new NotFoundException('No se encontró el estado inicial "CREADA"');
      }
    }

    const task = this.tasksRepository.create({
      name: dto.name.trim(),
      description: dto.description?.trim() || undefined,
      priority,
      state,
      startDate: dto.startDate,
      estimatedDate: dto.estimatedDate
    });

    const savedTask = await this.tasksRepository.save(task);

    let employee: Employee | undefined | null;
    if (dto.assigneeId) {
      employee = await this.employeesRepository.findOne({ where: { id: dto.assigneeId } });
      if (!employee) {
        throw new NotFoundException('Colaborador asignado no encontrado');
      }
      await this.ensureEmployeeAssignedToProject(projectId, employee.id);
    }

    const assignment = this.taskProjectRepository.create({
      project,
      task: savedTask,
      employee: employee ?? null
    });
    await this.taskProjectRepository.save(assignment);

    return savedTask;
  }

  private async ensureEmployeeAssignedToProject(projectId: string, employeeId: string) {
    const exists = await this.projectAssignmentRepository.findOne({
      where: { project: { id: projectId }, employee: { id: employeeId } }
    });
    if (exists) {
      return;
    }
    const project = await this.projectsRepository.findOne({ where: { id: projectId } });
    const employee = await this.employeesRepository.findOne({ where: { id: employeeId } });
    if (!project || !employee) {
      throw new NotFoundException('No se pudo asociar el colaborador con el proyecto');
    }
    const assignment = this.projectAssignmentRepository.create({ project, employee });
    await this.projectAssignmentRepository.save(assignment);
  }

  async assignCollaborators(
    projectId: string,
    taskId: string,
    dto: AssignCollaboratorsDto,
    user: AuthenticatedUser
  ) {
    if (user.roleName !== 'GESTOR') {
      throw new ForbiddenException('Solo un gestor puede asignar colaboradores');
    }

    const task = await this.tasksRepository.findOne({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('Tarea no encontrada');
    }

    const project = await this.projectsRepository.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    const collaborators = await this.employeesRepository.find({
      where: { id: In(dto.collaboratorIds) }
    });
    if (collaborators.length !== dto.collaboratorIds.length) {
      throw new NotFoundException('Uno o más colaboradores no existen');
    }

    const invalidRoles = collaborators.filter((collaborator) => collaborator.role?.name !== 'COLABORADOR');
    if (invalidRoles.length > 0) {
      throw new BadRequestException('Solo se pueden asignar empleados con rol de colaborador');
    }

    const existingAssignments = await this.taskProjectRepository.find({
      where: {
        project: { id: projectId },
        task: { id: taskId }
      }
    });

    const newAssignments: TaskProject[] = [];
    for (const collaborator of collaborators) {
      await this.ensureEmployeeAssignedToProject(projectId, collaborator.id);
      const alreadyAssigned = existingAssignments.some(
        (assignment) => assignment.employee?.id === collaborator.id
      );
      if (!alreadyAssigned) {
        const assignment = this.taskProjectRepository.create({
          project,
          task,
          employee: collaborator
        });
        newAssignments.push(assignment);
      }
    }

    if (newAssignments.length > 0) {
      await this.taskProjectRepository.save(newAssignments);
    }
const assignmentsWithCollaborators = [...existingAssignments, ...newAssignments].filter(
      (assignment) => Boolean(assignment.employee)
    );

    const currentState = normalizeStateName(task.state.description);
    if (assignmentsWithCollaborators.length > 0 && currentState === 'CREADA') {
      const pendingState = await this.taskStatesRepository.findOne({ where: { description: 'PENDIENTE' } });
      if (!pendingState) {
        throw new NotFoundException('No se encontró el estado "PENDIENTE" en el catálogo');
      }

      task.state = pendingState;
      await this.tasksRepository.save(task);

      const manager = await this.employeesRepository.findOne({ where: { id: user.id } });
      const startDate = new Date().toISOString().slice(0, 10);

      await this.closeActiveEvolution(task.id, startDate);

      const evolution = this.taskEvolutionRepository.create({
        task,
        state: pendingState,
        employee: manager ?? null,
        startDate,
        description: 'Asignación de colaboradores'
      });

      await this.taskEvolutionRepository.save(evolution);
    }

    return this.getTaskAssignments(taskId);
  }

  private async getTaskAssignments(taskId: string) {
    return this.taskProjectRepository.find({
      where: { task: { id: taskId } },
      relations: ['employee', 'project', 'task']
    });
  }

  async removeTask(projectId: string, taskId: string, user: AuthenticatedUser) {
    if (user.roleName !== 'GESTOR') {
      throw new ForbiddenException('Solo un gestor puede eliminar tareas');
    }

    await this.ensureProjectAccess(projectId, user);

    const task = await this.tasksRepository.findOne({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('Tarea no encontrada');
    }

    const assignmentExists = await this.taskProjectRepository.exist({
      where: { project: { id: projectId }, task: { id: taskId } }
    });
    if (!assignmentExists) {
      throw new NotFoundException('La tarea no pertenece al proyecto indicado');
    }

    await this.taskProjectResourceRepository.delete({ task: { id: taskId } });
    await this.taskProjectRepository.delete({ task: { id: taskId } });
    await this.tasksRepository.delete({ id: taskId });

    return { success: true };
  }

  async assignResource(
    projectId: string,
    taskId: string,
    dto: AssignResourceDto,
    user: AuthenticatedUser
  ) {
    if (user.roleName !== 'GESTOR') {
      throw new ForbiddenException('Solo un gestor puede asignar recursos');
    }

    await this.ensureProjectAccess(projectId, user);

    const task = await this.tasksRepository.findOne({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('Tarea no encontrada');
    }

    const project = await this.projectsRepository.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    const resource = await this.resourcesRepository.findOne({ where: { id: dto.resourceId } });
    if (!resource) {
      throw new NotFoundException('Recurso no encontrado');
    }

    let allocation = await this.taskProjectResourceRepository.findOne({
      where: {
        task: { id: taskId },
        project: { id: projectId },
        resource: { id: dto.resourceId }
      }
    });

    if (allocation) {
      allocation.quantity = dto.quantity;
    } else {
      allocation = this.taskProjectResourceRepository.create({
        task,
        project,
        resource,
        quantity: dto.quantity
      });
    }

    return this.taskProjectResourceRepository.save(allocation);
  }

  async updateTaskStatus(
    projectId: string,
    taskId: string,
    dto: UpdateTaskStatusDto,
    user: AuthenticatedUser
  ) {
    await this.ensureProjectAccess(projectId, user);

    const task = await this.tasksRepository.findOne({
      where: { id: taskId },
      relations: ['state']
    });
    if (!task) {
      throw new NotFoundException('Tarea no encontrada');
    }

    const state = await this.taskStatesRepository.findOne({ where: { id: dto.stateId } });
    if (!state) {
      throw new NotFoundException('Estado de tarea inválido');
    }

    const hasAssignment = await this.ensureAssignmentForUpdate(taskId, user);
    await this.ensureValidStateTransition(task, state, user, hasAssignment);

    task.state = state;
    if (dto.startDate) {
      task.startDate = dto.startDate;
    }
    if (dto.endDate) {
      task.endDate = dto.endDate;
    }
    await this.tasksRepository.save(task);

    const employee = await this.employeesRepository.findOne({ where: { id: user.id } });
    const startDate = dto.startDate ?? new Date().toISOString().slice(0, 10);

    await this.closeActiveEvolution(task.id, startDate);
    const evolution = this.taskEvolutionRepository.create({
      task,
      state,
      employee: employee ?? null,
      startDate,
      endDate: dto.endDate,
      description: dto.description
    });

    await this.taskEvolutionRepository.save(evolution);

    return this.tasksRepository.findOne({
      where: { id: taskId },
      relations: ['state', 'priority']
    });
  }

  private async ensureAssignmentForUpdate(taskId: string, user: AuthenticatedUser) {
    if (user.roleName !== 'COLABORADOR') {
      return false;
    }

    const assignment = await this.taskProjectRepository.findOne({
      where: { task: { id: taskId }, employee: { id: user.id } }
    });

    if (!assignment) {
      throw new ForbiddenException('No puedes actualizar una tarea que no te fue asignada.');
    }

    return true;
  }

  private ensureValidStateTransition(
    task: Task,
    targetState: TaskState,
    user: AuthenticatedUser,
    hasAssignment: boolean
  ) {
    const currentStateName = normalizeStateName(task.state.description);
    const nextStateName = normalizeStateName(targetState.description);

    if (!currentStateName || !nextStateName) {
      throw new ForbiddenException('Los estados de la tarea no están configurados correctamente.');
    }

    if (currentStateName === nextStateName) {
      return;
    }

    const transitions = TASK_STATE_TRANSITIONS[currentStateName];
    const rule = transitions?.[nextStateName];

    if (!rule) {
      throw new ForbiddenException(
        `No es posible cambiar una tarea de "${task.state.description}" a "${targetState.description}".`
      );
    }

    if (!rule.allowedRoles.includes(user.roleName)) {
      throw new ForbiddenException('Tu rol no puede realizar esta transición de estado.');
    }

    if (rule.requiresAssignment && !hasAssignment) {
      throw new ForbiddenException('Debes estar asignado a la tarea para realizar esta transición.');
    }
  }

  async getProjectTasks(projectId: string, user: AuthenticatedUser) {
    await this.ensureProjectAccess(projectId, user);

    return this.taskProjectRepository.find({
      where: { project: { id: projectId } },
      relations: ['task', 'task.priority', 'task.state', 'employee']
    });
  }

  async getPriorities() {
    return this.prioritiesRepository.find({ order: { description: 'ASC' } });
  }

  async getTaskStates() {
    return this.taskStatesRepository.find({ order: { description: 'ASC' } });
  }
  async getResources() {
    return this.resourcesRepository.find({ order: { description: 'ASC' } });
  }

  private async closeActiveEvolution(taskId: string, endDate: string) {
    const latestEvolution = await this.taskEvolutionRepository.findOne({
      where: { task: { id: taskId }, endDate: IsNull() },
      order: { startDate: 'DESC', id: 'DESC' }
    });

    if (!latestEvolution) {
      return;
    }

    latestEvolution.endDate = endDate;
    await this.taskEvolutionRepository.save(latestEvolution);
  }
}