import { Injectable } from '@nestjs/common';

export interface MealPrepSettings {
  id: string;
  duration: number;
  sessionsPerWeek: number;
  minDaysBetweenSessions?: number;
  userId: string;
}

@Injectable()
export class MockMealPrepService {
  private settings: MealPrepSettings[] = [
    {
      id: 'mealprep-1',
      duration: 90,
      sessionsPerWeek: 2,
      minDaysBetweenSessions: 3,
      userId: 'demo-user-id',
    },
  ];

  findByUser(userId: string): MealPrepSettings {
    let userSettings = this.settings.find((s) => s.userId === userId);
    if (!userSettings) {
      userSettings = this.create(userId);
    }
    return userSettings;
  }

  create(userId: string): MealPrepSettings {
    const settings: MealPrepSettings = {
      id: `mealprep-${Date.now()}`,
      duration: 90,
      sessionsPerWeek: 2,
      userId,
    };
    this.settings.push(settings);
    return settings;
  }

  update(userId: string, dto: Partial<MealPrepSettings>): MealPrepSettings {
    let settings = this.settings.find((s) => s.userId === userId);
    if (!settings) {
      settings = this.create(userId);
    }
    Object.assign(settings, dto);
    return settings;
  }
}
