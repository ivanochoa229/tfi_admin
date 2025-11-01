import { IsBase64, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class UploadDocumentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  mimeType: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  extension: string;

  @IsInt()
  @Min(0)
  sizeBytes: number;

  @IsString()
  @IsBase64()
  @MinLength(1)
  contentBase64: string;

  @IsOptional()
  @IsString()
  checksum?: string;
}