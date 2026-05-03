import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkoutLog } from '../workout-log/workout-log.entity';
import { PlannedSession } from '../planned-session/planned-session.entity';
import { PlanWeek } from '../plan-week/plan-week.entity';
import { TrainingPlan } from '../training-plan/training-plan.entity';
import { Note } from '../note/note.entity';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [TypeOrmModule.forFeature([WorkoutLog, PlannedSession, PlanWeek, TrainingPlan, Note])],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
