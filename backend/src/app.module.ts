import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { WorkoutModule } from './workout/workout.module';
import { CalendarEventModule } from './calendar-event/calendar-event.module';
import { MealPrepModule } from './mealprep/mealprep.module';
import { SchedulerSettingsModule } from './scheduler-settings/scheduler-settings.module';
import { SchedulerModule } from './scheduler/scheduler.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'myapp',
      autoLoadEntities: true,
      synchronize: true, // Creates tables automatically - disable in production
    }),
    AuthModule,
    UserModule,
    WorkoutModule,
    CalendarEventModule,
    MealPrepModule,
    SchedulerSettingsModule,
    SchedulerModule,
  ],
})
export class AppModule {}
