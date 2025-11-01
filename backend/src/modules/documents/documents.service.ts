import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../../database/entities/document.entity';
import { Task } from '../../database/entities/task.entity';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { TaskProject } from '../../database/entities/task-project.entity';
import { Employee } from '../../database/entities/employee.entity';
import * as crypto from 'crypto';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly documentsRepository: Repository<Document>,
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectRepository(TaskProject)
    private readonly taskProjectRepository: Repository<TaskProject>,
    @InjectRepository(Employee)
    private readonly employeesRepository: Repository<Employee>
  ) {}

  private async ensureTaskAccess(taskId: string, user: AuthenticatedUser) {
    if (user.roleName === 'GESTOR') {
      return;
    }

    const assignment = await this.taskProjectRepository.findOne({
      where: { task: { id: taskId }, employee: { id: user.id } }
    });

    if (!assignment) {
      throw new ForbiddenException('No puedes gestionar documentación de una tarea no asignada');
    }
  }

  async upload(taskId: string, dto: UploadDocumentDto, user: AuthenticatedUser) {
    await this.ensureTaskAccess(taskId, user);

    const task = await this.tasksRepository.findOne({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('La tarea indicada no existe');
    }

    const buffer = Buffer.from(dto.contentBase64, 'base64');
    if (buffer.length !== dto.sizeBytes) {
      throw new BadRequestException('El tamaño informado no coincide con el archivo recibido');
    }

    const checksum = dto.checksum ?? crypto.createHash('md5').update(buffer).digest('hex');
    const employee = await this.employeesRepository.findOne({ where: { id: user.id } });

    const document = this.documentsRepository.create({
      task,
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      extension: dto.extension,
      sizeBytes: dto.sizeBytes,
      content: buffer,
      checksum,
      uploadedBy: employee ?? null
    });

    return this.documentsRepository.save(document);
  }

  async list(taskId: string, user: AuthenticatedUser) {
    await this.ensureTaskAccess(taskId, user);
    return this.documentsRepository.find({
      where: { task: { id: taskId } },
      order: { uploadedAt: 'DESC' },
      relations: ['uploadedBy']
    });
  }

  async remove(documentId: string, user: AuthenticatedUser) {
    const document = await this.documentsRepository.findOne({
      where: { id: documentId },
      relations: ['task']
    });
    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }

    await this.ensureTaskAccess(document.task.id, user);
    await this.documentsRepository.remove(document);
    return { success: true };
  }
}