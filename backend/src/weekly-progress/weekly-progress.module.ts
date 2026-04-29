import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WeeklyProgress } from './weekly-progress.entity';
import { TrainingPlan } from '../training-plan/training-plan.entity';
import { WeeklyProgressService } from './weekly-progress.service';
import { WeeklyProgressController } from './weekly-progress.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WeeklyProgress, TrainingPlan])],
  controllers: [WeeklyProgressController],
  providers: [WeeklyProgressService],
  exports: [WeeklyProgressService],
})
export class WeeklyProgressModule {}
