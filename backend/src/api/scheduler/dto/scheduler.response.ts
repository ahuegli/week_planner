import { CalendarEvent, Workout } from '../../../shared/models';

export class UnplacedWorkoutDto {
  workoutId: string;
  workoutName: string;
  workout: Workout;
  reason: string;
  frequency: number;
}

export class GenerateScheduleResponse {
  placedEvents: CalendarEvent[];
  unplacedWorkouts: UnplacedWorkoutDto[];
  totalScore: number;
  placedWorkoutCount: number;
  placedLongWorkoutCount: number;
  weightedWorkoutScore: number;
}

export class UnplacedPlanSessionDto {
  weekNumber: number;
  sessionName: string;
  reason: string;
}

export class GeneratePlanResponse {
  scheduledWeeks: number;
  totalEventsPlaced: number;
  unplacedSessions: UnplacedPlanSessionDto[];
}

export class RescheduleConflictsResponse {
  conflictsFound: number;
  weeksRescheduled: number;
  workoutsRescheduled: number;
  affectedWeeks: number[];
}

export class ValidateConstraintsResponse {
  isValid: boolean;
  violations: string[];
}

export class ScoreSlotResponse {
  score: number;
}

export class ConflictSuggestionDto {
  eventId: string;
  title: string;
  day: number;
  date: string;
  startTime: string;
  endTime: string;
  priority: string;
  isManuallyPlaced: boolean;
  suggestion: {
    action: 'shift_time' | 'move_day' | 'cannot_resolve';
    suggestedDay?: number;
    suggestedDate?: string;
    suggestedStartTime?: string;
    suggestedEndTime?: string;
    reason: string;
  };
}

export class CheckConflictsResponse {
  hasConflicts: boolean;
  conflicts: ConflictSuggestionDto[];
}

export class ApplyConflictsResponse {
  moved: number;
}
