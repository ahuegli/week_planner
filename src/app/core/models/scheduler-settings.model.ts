export type PriorityItem = 'sport' | 'recovery' | 'mealprep';

export interface EnduranceThreshold {
  durationMin: number;
  distanceKm: number;
}

export interface SchedulerSettings {
  sleepHoursRequired: number;
  commuteMinutes: number;
  enduranceThresholds: {
    running: EnduranceThreshold;
    biking: EnduranceThreshold;
    swimming: EnduranceThreshold;
  };
  priorityHierarchy: PriorityItem[];
}

export const DEFAULT_SETTINGS: SchedulerSettings = {
  sleepHoursRequired: 8,
  commuteMinutes: 0,
  enduranceThresholds: {
    running: { durationMin: 60, distanceKm: 15 },
    biking: { durationMin: 90, distanceKm: 40 },
    swimming: { durationMin: 60, distanceKm: 3 },
  },
  priorityHierarchy: ['sport', 'recovery', 'mealprep'],
};