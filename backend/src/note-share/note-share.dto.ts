import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateNoteShareDto {
  @IsString()
  recipientEmail: string;

  @IsString()
  noteId: string;

  @IsOptional()
  @IsIn(['view', 'collaborate'])
  permission?: 'view' | 'collaborate';
}

export class UpdateNoteShareDto {
  @IsOptional()
  @IsIn(['view', 'collaborate'])
  permission?: 'view' | 'collaborate';

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
