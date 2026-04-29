export type PriorityItem = 'sport' | 'recovery' | 'mealprep';

export interface EnduranceThreshold {
  durationMin: number;
  distanceKm: number;
}

export interface SchedulerSettings {
  commuteMinutes: number;
  autoPlaceEarliestTime: string;
  autoPlaceLatestTime: string;
  preferredWorkoutTimes: string[];
  enduranceWeight: number;
  strengthWeight: number;
  yogaWeight: number;
  enduranceThresholds: {
    running: EnduranceThreshold;
    biking: EnduranceThreshold;
    swimming: EnduranceThreshold;
  };
  enduranceRestDays: number;
  priorityHierarchy: PriorityItem[];
  maxTrainingDaysPerWeek: number;
}

export const DEFAULT_SETTINGS: SchedulerSettings = {
  commuteMinutes: 0,
  autoPlaceEarliestTime: '06:00',
  autoPlaceLatestTime: '22:00',
  preferredWorkoutTimes: [],
  enduranceWeight: 45,
  strengthWeight: 30,
  yogaWeight: 25,
  enduranceThresholds: {
    running: { durationMin: 60, distanceKm: 15 },
    biking: { durationMin: 90, distanceKm: 40 },
    swimming: { durationMin: 60, distanceKm: 3 },
  },
  enduranceRestDays: 1,
  priorityHierarchy: ['sport', 'recovery', 'mealprep'],
  maxTrainingDaysPerWeek: 7,
};
