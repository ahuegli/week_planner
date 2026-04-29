import { IsArray, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateSymptomLogDto {
  @IsDateString()
  date: string;

  @IsArray()
  @IsString({ each: true })
  symptoms: string[];

  @IsOptional()
  @IsString()
  otherSymptom?: string;
}

export class UpdateSymptomLogDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  symptoms?: string[];

  @IsOptional()
  @IsString()
  otherSymptom?: string;
}
