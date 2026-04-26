import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { WorkoutModule } from './workout/workout.module';
import { CalendarEventModule } from './calendar-event/calendar-event.module';
import { MealPrepModule } from './mealprep/mealprep.module';
import { SchedulerSettingsModule } from './scheduler-settings/scheduler-settings.module';
import { SchedulerModule } from './api/scheduler/scheduler.module';
import { MockDataModule } from './mock-data/mock-data.module';
import { TrainingPlanModule } from './training-plan/training-plan.module';
import { PlannedSessionModule } from './planned-session/planned-session.module';
import { WeeklyProgressModule } from './weekly-progress/weekly-progress.module';
import { CycleProfileModule } from './cycle-profile/cycle-profile.module';
import { NoteModule } from './note/note.module';
import { EnergyCheckInModule } from './energy-check-in/energy-check-in.module';
import { SymptomLogModule } from './symptom-log/symptom-log.module';
import { WorkoutLogModule } from './workout-log/workout-log.module';
import { StatsModule } from './stats/stats.module';

const USE_DATABASE = process.env.USE_DATABASE !== 'false';

const databaseImports = USE_DATABASE
  ? [
      TypeOrmModule.forRoot({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'myapp',
        autoLoadEntities: true,
        synchronize: true,
        ssl: { rejectUnauthorized: false },
      }),
      AuthModule,
      UserModule,
      WorkoutModule,
      CalendarEventModule,
      MealPrepModule,
      SchedulerSettingsModule,
      TrainingPlanModule,
      PlannedSessionModule,
      WeeklyProgressModule,
      CycleProfileModule,
      NoteModule,
      EnergyCheckInModule,
      SymptomLogModule,
      WorkoutLogModule,
      StatsModule,
    ]
  : [MockDataModule];

@Module({
  imports: [...databaseImports, SchedulerModule],
})
export class AppModule {}
