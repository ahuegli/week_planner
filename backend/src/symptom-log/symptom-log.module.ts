import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SymptomLog } from './symptom-log.entity';
import { SymptomLogController } from './symptom-log.controller';
import { SymptomLogService } from './symptom-log.service';

@Module({
  imports: [TypeOrmModule.forFeature([SymptomLog])],
  controllers: [SymptomLogController],
  providers: [SymptomLogService],
  exports: [SymptomLogService],
})
export class SymptomLogModule {}
