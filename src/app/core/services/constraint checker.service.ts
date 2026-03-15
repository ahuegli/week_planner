import { Injectable } from '@angular/core';
import { CalendarEvent, CalendarEventType } from '../models/calendar-event.model';
import { SchedulerSettings } from '../models/scheduler-settings.model';
import { WeekContext } from '../models/week context.model';
import { Workout, isEnduranceType } from '../models/workout.model';
import { toMinutes } from '../utils/time-utils';

export interface ConstraintContext {
  shifts: CalendarEvent[];
  weekContext: WeekContext;
  settings: SchedulerSettings;
  alreadyPlaced: CalendarEvent[];
  minDaysBetweenMealPrepSessions: number;
}

@Injectable({
  providedIn: 'root',
})
export class ConstraintCheckerService {
  isHardViolation(
    day: number,
    startMin: number,
    endMin: number,
    type: CalendarEventType,
    workout: Workout | null,
    ctx: ConstraintContext,
  ): boolean {
    if (this.violatesSleepWindow(day, startMin, endMin, ctx)) {
      return true;
    }

    if (type === 'workout' && this.isMorningAfterNightShift(day, ctx.shifts)) {
      return true;
    }

    if (
      type === 'workout' &&
      workout !== null &&
      this.isEnduranceNeedingRestDay(workout, ctx.settings) &&
      this.nextDayHasActivity(day, ctx.alreadyPlaced)
    ) {
      return true;
    }

    if (type === 'mealprep' && this.hasConsecutiveMealPrep(day, ctx)) {
      return true;
    }

    return false;
  }

  private violatesSleepWindow(
    day: number,
    startMin: number,
    endMin: number,
    ctx: ConstraintContext,
  ): boolean {
    const sleepMinutes = ctx.settings.sleepHoursRequired * 60;
    const latestStart = 24 * 60 - sleepMinutes;

    if (endMin > latestStart) {
      return true;
    }

    const nightShiftOnDay = ctx.shifts.find(
      (s) => s.day === day && s.shiftType === 'night',
    );
    if (nightShiftOnDay) {
      const shiftEnd = toMinutes(nightShiftOnDay.endTime);
      const shiftEndNormalized = shiftEnd < 12 * 60 ? shiftEnd + 24 * 60 : shiftEnd;
      const bufferEnd = shiftEndNormalized % (24 * 60) + sleepMinutes;
      if (startMin < bufferEnd % (24 * 60)) {
        return true;
      }
    }

    return false;
  }

  private isMorningAfterNightShift(day: number, shifts: CalendarEvent[]): boolean {
    const previousDay = (day + 6) % 7;
    return shifts.some((s) => s.day === previousDay && s.shiftType === 'night');
  }

  private isEnduranceNeedingRestDay(workout: Workout, settings: SchedulerSettings): boolean {
    const type = workout.workoutType;

    if (!isEnduranceType(type)) {
      return false;
    }

    const threshold = settings.enduranceThresholds[type as 'running' | 'biking' | 'swimming'];
    if (!threshold) {
      return false;
    }

    const durationExceeds = workout.duration >= threshold.durationMin;
    const distanceExceeds =
      workout.distanceKm !== undefined && workout.distanceKm >= threshold.distanceKm;

    return durationExceeds || distanceExceeds;
  }

  private nextDayHasActivity(day: number, alreadyPlaced: CalendarEvent[]): boolean {
    const nextDay = (day + 1) % 7;
    return alreadyPlaced.some((e) => e.day === nextDay && e.type === 'workout');
  }

  private hasConsecutiveMealPrep(day: number, ctx: ConstraintContext): boolean {
    const minGap = ctx.minDaysBetweenMealPrepSessions ?? 1;
    const allMealPreps = ctx.alreadyPlaced.filter((e) => e.type === 'mealprep');
    return allMealPreps.some((e) => Math.abs(e.day - day) <= minGap);
  }
}