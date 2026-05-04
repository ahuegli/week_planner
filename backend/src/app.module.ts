import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { UserThrottlerGuard } from './throttler/user-throttler.guard';
import { JwtAuthExceptionFilter } from './auth/jwt-auth-exception.filter';
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
import { AiModule } from './ai/ai.module';
import { CalendarShareModule } from './calendar-share/calendar-share.module';
import { NoteShareModule } from './note-share/note-share.module';
import { EventInvitationModule } from './event-invitation/event-invitation.module';
import { RaceDayPlanModule } from './race-day-plan/race-day-plan.module';

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
        synchronize: process.env.NODE_ENV !== 'production',
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
      AiModule,
      CalendarShareModule,
      NoteShareModule,
      EventInvitationModule,
      RaceDayPlanModule,
    ]
  : [MockDataModule];

// Identifies which named throttlers are explicitly declared on a route via @Throttle.
// Metadata key is the internal format used by @nestjs/throttler's Throttle decorator.
function hasThrottleMetadata(name: string, ctx: import('@nestjs/common').ExecutionContext): boolean {
  const key = `THROTTLER:LIMIT${name}`;
  const onHandler = Reflect.getMetadata(key, ctx.getHandler());
  const onClass = Reflect.getMetadata(key, ctx.getClass());
  return onHandler !== undefined || onClass !== undefined;
}

@Module({
  imports: [
    ...databaseImports,
    SchedulerModule,
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 10 },
      {
        name: 'ai_hourly',
        ttl: 3_600_000,
        limit: 20,
        skipIf: (ctx) => !hasThrottleMetadata('ai_hourly', ctx),
      },
      {
        name: 'ai_daily',
        ttl: 86_400_000,
        limit: 100,
        skipIf: (ctx) => !hasThrottleMetadata('ai_daily', ctx),
      },
      {
        name: 'plan_gen',
        ttl: 60_000,
        limit: 2,
        skipIf: (ctx) => !hasThrottleMetadata('plan_gen', ctx),
      },
    ]),
  ],
  providers: [
    { provide: APP_FILTER, useClass: JwtAuthExceptionFilter },
    { provide: APP_GUARD, useClass: UserThrottlerGuard },
  ],
})
export class AppModule {}
