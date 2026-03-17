export type PriorityItem = 'sport' | 'recovery' | 'mealprep';

export interface EnduranceThreshold {
  durationMin: number;
  distanceKm: number;
}

export interface SchedulerSettings {
  commuteMinutes: number;
  autoPlaceEarliestTime: string; // HH:MM format
  autoPlaceLatestTime: string; // HH:MM format
  enduranceThresholds: {
    running: EnduranceThreshold;
    biking: EnduranceThreshold;
    swimming: EnduranceThreshold;
  };
  enduranceRestDays: number; // Days before/after endurance workouts that block other sessions
  priorityHierarchy: PriorityItem[];
}

export const DEFAULT_SETTINGS: SchedulerSettings = {
  commuteMinutes: 0,
  autoPlaceEarliestTime: '06:00',
  autoPlaceLatestTime: '22:00',
  enduranceThresholds: {
    running: { durationMin: 60, distanceKm: 15 },
    biking: { durationMin: 90, distanceKm: 40 },
    swimming: { durationMin: 60, distanceKm: 3 },
  },
  enduranceRestDays: 1,
  priorityHierarchy: ['sport', 'recovery', 'mealprep'],
};