import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  estimatedDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsNumber()
  budget: number;

  @IsUUID()
  priorityId: string;
}