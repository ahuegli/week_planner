import { Module, Global } from '@nestjs/common';
import { MockAuthService } from './mock-auth.service';
import { MockWorkoutService } from './mock-workout.service';
import { MockCalendarEventService } from './mock-calendar-event.service';
import { MockMealPrepService } from './mock-mealprep.service';
import { MockSchedulerSettingsService } from './mock-scheduler-settings.service';
import { MockAuthController } from './mock-auth.controller';
import { MockWorkoutController } from './mock-workout.controller';
import { MockCalendarEventController } from './mock-calendar-event.controller';
import { MockMealPrepController } from './mock-mealprep.controller';
import { MockSchedulerSettingsController } from './mock-scheduler-settings.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MockJwtStrategy } from './mock-jwt.strategy';

@Global()
@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'mock-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [
    MockAuthController,
    MockWorkoutController,
    MockCalendarEventController,
    MockMealPrepController,
    MockSchedulerSettingsController,
  ],
  providers: [
    MockAuthService,
    MockWorkoutService,
    MockCalendarEventService,
    MockMealPrepService,
    MockSchedulerSettingsService,
    MockJwtStrategy,
  ],
  exports: [
    MockAuthService,
    MockWorkoutService,
    MockCalendarEventService,
    MockMealPrepService,
    MockSchedulerSettingsService,
  ],
})
export class MockDataModule {}
