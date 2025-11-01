import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Task } from './task.entity';
import { Employee } from './employee.entity';

@Entity({ name: 'documento' })
export class Document {
  @PrimaryGeneratedColumn('uuid', { name: 'id_documento' })
  id: string;

  @ManyToOne(() => Task, (task) => task.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_tarea' })
  task: Task;

  @Column({ name: 'nombre_archivo', type: 'varchar', length: 255 })
  fileName: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ name: 'extension', type: 'varchar', length: 10 })
  extension: string;

  @Column({ name: 'tamanio_bytes', type: 'bigint', nullable: true })
  sizeBytes?: number;

  @Column({ name: 'contenido', type: 'bytea' })
  content: Buffer;

  @Column({ name: 'checksum_md5', type: 'char', length: 32, nullable: true })
  checksum?: string;

  @ManyToOne(() => Employee, (employee) => employee.uploadedDocuments, { eager: true, nullable: true })
  @JoinColumn({ name: 'subido_por' })
  uploadedBy?: Employee | null;

  @CreateDateColumn({ name: 'subido_en', type: 'timestamp' })
  uploadedAt: Date;
}