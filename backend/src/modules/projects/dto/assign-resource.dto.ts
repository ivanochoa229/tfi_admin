import { IsInt, IsPositive, IsUUID } from 'class-validator';

export class AssignResourceDto {
  @IsUUID()
  resourceId: string;

  @IsInt()
  @IsPositive()
  quantity: number;
}