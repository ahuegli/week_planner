import { Injectable } from '@angular/core';
import { CalendarEvent } from '../models/calendar-event.model';
import { MealPrep } from '../models/mealprep.model';
import { DEFAULT_SETTINGS, PriorityItem, SchedulerSettings } from '../models/scheduler-settings.model';
import { DEFAULT_WEEK_CONTEXT, WeekContext } from '../models/week context.model';
import { Workout } from '../models/workout.model';
import { addMinutes, eventIntervals, overlaps, TimeInterval } from '../utils/time-utils';
import { ConstraintCheckerService } from './constraint checker.service';
import { ScoringEngineService } from './scoring engine.service';

export interface GenerationInput {
  existingEvents: CalendarEvent[];
  workouts: Workout[];
  mealPrep: MealPrep;
  settings?: SchedulerSettings;
  weekContext?: WeekContext;
}

interface Candidate {
  day: number;
  startMin: number;
  score: number;
}

@Injectable({
  providedIn: 'root',
})
export class ScheduleGeneratorService {
  constructor(
    private readonly constraintChecker: ConstraintCheckerService,
    private readonly scoringEngine: ScoringEngineService,
  ) {}

  generate(input: GenerationInput): CalendarEvent[] {
    const settings = input.settings ?? DEFAULT_SETTINGS;
    const weekContext = input.weekContext ?? DEFAULT_WEEK_CONTEXT;

    const shiftEvents = input.existingEvents.filter((e) => e.type === 'shift');
    const lockedEvents = input.existingEvents.filter((e) => e.isLocked === true);
    const generatedEvents: CalendarEvent[] = [];

    const occupied: TimeInterval[] = [
      ...shiftEvents.flatMap((e) => eventIntervals(e)),
      ...lockedEvents.flatMap((e) => eventIntervals(e)),
      ...weekContext.personalEvents.flatMap((e) => eventIntervals(e)),
    ];

    const workoutSessions = input.workouts.flatMap((workout) =>
      Array.from({ length: workout.frequencyPerWeek }, (_, index) => ({ workout, index })),
    );

    for (const priority of settings.priorityHierarchy) {
      if (priority === 'sport') {
        for (const session of workoutSessions) {
          const event = this.placeBestCandidate({
            duration: session.workout.duration,
            type: 'workout',
            title: session.workout.name,
            workout: session.workout,
            shifts: shiftEvents,
            occupied,
            alreadyPlaced: generatedEvents,
            settings,
            weekContext,
            minDaysBetweenMealPrepSessions: input.mealPrep.minDaysBetweenSessions ?? 1,
          });

          if (event) {
            generatedEvents.push(event);
            occupied.push(...eventIntervals(event));
          }
        }
      }

      if (priority === 'mealprep') {
        for (let i = 0; i < input.mealPrep.sessionsPerWeek; i += 1) {
          const event = this.placeBestCandidate({
            duration: input.mealPrep.duration,
            type: 'mealprep',
            title: 'Meal Prep',
            workout: null,
            shifts: shiftEvents,
            occupied,
            alreadyPlaced: generatedEvents,
            settings,
            weekContext,
            minDaysBetweenMealPrepSessions: input.mealPrep.minDaysBetweenSessions ?? 1,
          });

          if (event) {
            generatedEvents.push(event);
            occupied.push(...eventIntervals(event));
          }
        }
      }

      // 'recovery' is reserved for future rest-day logic
    }

    return generatedEvents;
  }

  private placeBestCandidate(params: {
    duration: number;
    type: 'workout' | 'mealprep';
    title: string;
    workout: Workout | null;
    shifts: CalendarEvent[];
    occupied: TimeInterval[];
    alreadyPlaced: CalendarEvent[];
    settings: SchedulerSettings;
    weekContext: WeekContext;
    minDaysBetweenMealPrepSessions: number;
  }): CalendarEvent | null {
    const {
      duration, type, title, workout,
      shifts, occupied, alreadyPlaced,
      settings, weekContext, minDaysBetweenMealPrepSessions,
    } = params;

    const constraintCtx = {
      shifts,
      weekContext,
      settings,
      alreadyPlaced,
      minDaysBetweenMealPrepSessions,
    };

    const scoringCtx = { shifts, weekContext, settings, alreadyPlaced };
    const candidates: Candidate[] = [];

    for (let day = 0; day < 7; day++) {
      const dayOccupied = occupied.filter((s) => s.day === day);

      for (let startMin = 6 * 60; startMin <= 22 * 60; startMin += 30) {
        const endMin = startMin + duration;

        if (endMin > 23 * 60) {
          break;
        }

        const slotFree = !dayOccupied.some((s) =>
          overlaps({ day, start: startMin, end: endMin }, s),
        );

        if (!slotFree) {
          continue;
        }

        if (
          this.constraintChecker.isHardViolation(
            day, startMin, endMin, type, workout, constraintCtx,
          )
        ) {
          continue;
        }

        const score = this.scoringEngine.score(day, startMin, type, scoringCtx);
        candidates.push({ day, startMin, score });
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];

    const startTime = this.minutesToString(best.startMin);
    return {
      id: crypto.randomUUID(),
      title,
      type,
      day: best.day,
      startTime,
      endTime: addMinutes(startTime, duration),
      durationMinutes: duration,
    };
  }

  private minutesToString(minutes: number): string {
    const hours = Math.floor(minutes / 60).toString().padStart(2, '0');
    const remaining = (minutes % 60).toString().padStart(2, '0');
    return `${hours}:${remaining}`;
  }
}