export interface MealPrepSession {
  id: string;
  name: string;
  duration: number;
  frequencyPerWeek: number;
  daysPreppedFor: number;
}

export interface MealPrep {
  duration: number;
  sessionsPerWeek: number;
  daysPreppedFor?: number;
}