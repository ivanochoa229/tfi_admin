import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class AssignCollaboratorsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  collaboratorIds: string[];
}