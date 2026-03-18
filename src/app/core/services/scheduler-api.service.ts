import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CalendarEvent } from '../models/calendar-event.model';
import { MealPrep } from '../models/mealprep.model';
import { SchedulerSettings } from '../models/scheduler-settings.model';
import { WeekContext } from '../models/week context.model';
import { Workout, WorkoutType } from '../models/workout.model';

export interface GenerateScheduleRequest {
  existingEvents: CalendarEvent[];
  workouts: Workout[];
  mealPrep: MealPrep;
  settings?: SchedulerSettings;
  weekContext?: WeekContext;
}

export interface UnplacedWorkout {
  workoutId: string;
  workoutName: string;
  workout: Workout;
  reason: string;
  frequency: number;
}

export interface GenerateScheduleResponse {
  placedEvents: CalendarEvent[];
  unplacedWorkouts: UnplacedWorkout[];
  totalScore: number;
  placedWorkoutCount: number;
  placedLongWorkoutCount: number;
  weightedWorkoutScore: number;
}

export interface ValidateConstraintsRequest {
  day: number;
  startMin: number;
  endMin: number;
  type: 'workout' | 'mealprep';
  workout?: Workout;
  existingEvents: CalendarEvent[];
  settings?: SchedulerSettings;
  weekContext?: WeekContext;
  minDaysBetweenMealPrepSessions?: number;
}

export interface ValidateConstraintsResponse {
  isValid: boolean;
  violations: string[];
}

export interface ScoreSlotRequest {
  day: number;
  startMin: number;
  endMin: number;
  type: 'workout' | 'mealprep';
  existingEvents: CalendarEvent[];
  settings?: SchedulerSettings;
  weekContext?: WeekContext;
  candidateWorkout?: {
    workoutType?: WorkoutType;
    isLongEndurance?: boolean;
    type: 'workout' | 'mealprep';
  };
  totalWorkoutsNeeded?: number;
}

export interface ScoreSlotResponse {
  score: number;
}

@Injectable({
  providedIn: 'root',
})
export class SchedulerApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api/v1/scheduler';

  /**
   * Generate optimal schedule based on inputs
   */
  generate(request: GenerateScheduleRequest): Observable<GenerateScheduleResponse> {
    return this.http.post<GenerateScheduleResponse>(`${this.baseUrl}/generate`, request);
  }

  /**
   * Validate if a specific slot violates hard constraints
   */
  validate(request: ValidateConstraintsRequest): Observable<ValidateConstraintsResponse> {
    return this.http.post<ValidateConstraintsResponse>(`${this.baseUrl}/validate`, request);
  }

  /**
   * Score a specific time slot
   */
  score(request: ScoreSlotRequest): Observable<ScoreSlotResponse> {
    return this.http.post<ScoreSlotResponse>(`${this.baseUrl}/score`, request);
  }
}
