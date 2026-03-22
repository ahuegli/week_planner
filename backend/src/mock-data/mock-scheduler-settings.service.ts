import { Injectable } from '@nestjs/common';

export interface SchedulerSettings {
  id: string;
  beforeShiftBufferMinutes: number;
  afterShiftBufferMinutes: number;
  enduranceWorkoutMinDuration: number;
  enduranceWeight: number;
  strengthWeight: number;
  yogaWeight: number;
  userId: string;
}

@Injectable()
export class MockSchedulerSettingsService {
  private settings: SchedulerSettings[] = [
    {
      id: 'settings-1',
      beforeShiftBufferMinutes: 60,
      afterShiftBufferMinutes: 120,
      enduranceWorkoutMinDuration: 60,
      enduranceWeight: 45,
      strengthWeight: 30,
      yogaWeight: 25,
      userId: 'demo-user-id',
    },
  ];

  findByUser(userId: string): SchedulerSettings {
    let userSettings = this.settings.find((s) => s.userId === userId);
    if (!userSettings) {
      userSettings = this.create(userId);
    }
    return userSettings;
  }

  create(userId: string): SchedulerSettings {
    const settings: SchedulerSettings = {
      id: `settings-${Date.now()}`,
      beforeShiftBufferMinutes: 60,
      afterShiftBufferMinutes: 120,
      enduranceWorkoutMinDuration: 60,
      enduranceWeight: 45,
      strengthWeight: 30,
      yogaWeight: 25,
      userId,
    };
    this.settings.push(settings);
    return settings;
  }

  update(userId: string, dto: Partial<SchedulerSettings>): SchedulerSettings {
    let settings = this.settings.find((s) => s.userId === userId);
    if (!settings) {
      settings = this.create(userId);
    }
    Object.assign(settings, dto);
    return settings;
  }
}
