import { Injectable } from '@nestjs/common';
import {
  CalendarEvent,
  CalendarEventType,
  SchedulerSettings,
  WeekContext,
  Workout,
  isEnduranceType,
} from '../shared/models';
import { toMinutes } from '../shared/utils/time-utils';

export interface ConstraintContext {
  shifts: CalendarEvent[];
  weekContext: WeekContext;
  settings: SchedulerSettings;
  alreadyPlaced: CalendarEvent[];
  minDaysBetweenMealPrepSessions: number;
}

@Injectable()
export class ConstraintCheckerService {
  isHardViolation(
    day: number,
    startMin: number,
    endMin: number,
    type: CalendarEventType,
    workout: Workout | null,
    ctx: ConstraintContext,
  ): boolean {
    if (type === 'workout' && this.isMorningAfterNightShift(day, ctx.shifts)) {
      return true;
    }

    if (
      type === 'workout' &&
      this.violatesShiftCommuteBuffer(day, startMin, endMin, ctx.shifts, ctx.settings)
    ) {
      return true;
    }

    if (
      type === 'workout' &&
      this.violatesCustomEventCommuteBuffer(day, startMin, endMin, ctx.alreadyPlaced)
    ) {
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

    if (
      type === 'workout' &&
      this.previousDayIsIntensiveWorkout(day, ctx.alreadyPlaced, ctx.settings)
    ) {
      return true;
    }

    if (
      type === 'workout' &&
      workout !== null &&
      this.nextDaysHaveIntensiveWorkout(day, ctx.alreadyPlaced, ctx.settings) &&
      this.isEnduranceNeedingRestDay(workout, ctx.settings)
    ) {
      return true;
    }

    if (
      type === 'workout' &&
      this.violatesMinimumRestBetweenWorkouts(day, startMin, ctx.alreadyPlaced)
    ) {
      return true;
    }

    if (
      type === 'workout' &&
      workout !== null &&
      this.violatesSameTypeOnSameDay(day, workout, ctx.alreadyPlaced)
    ) {
      return true;
    }

    if (
      type === 'workout' &&
      workout !== null &&
      this.violatesIntensiveDayWorkoutRule(day, workout, ctx)
    ) {
      return true;
    }

    if (type === 'mealprep' && this.hasConsecutiveMealPrep(day, ctx)) {
      return true;
    }

    return false;
  }

  private isMorningAfterNightShift(day: number, shifts: CalendarEvent[]): boolean {
    const previousDay = day - 1;
    if (previousDay < 0) {
      return false;
    }
    return shifts.some((s) => s.day === previousDay && s.shiftType === 'night');
  }

  private violatesShiftCommuteBuffer(
    day: number,
    startMin: number,
    endMin: number,
    shifts: CalendarEvent[],
    settings: SchedulerSettings,
  ): boolean {
    const dayShifts = shifts.filter((shift) => shift.day === day);

    for (const shift of dayShifts) {
      const shiftStart = toMinutes(shift.startTime);
      const shiftEnd = toMinutes(shift.endTime);
      const commute = shift.commuteMinutes ?? settings.commuteMinutes ?? 0;

      if (commute <= 0) {
        continue;
      }

      const preShiftBlockStart = Math.max(0, shiftStart - commute);
      const preShiftBlockEnd = shiftStart;

      if (startMin < preShiftBlockEnd && endMin > preShiftBlockStart) {
        return true;
      }

      if (shiftEnd >= shiftStart) {
        const postShiftBlockStart = shiftEnd;
        const postShiftBlockEnd = Math.min(24 * 60, shiftEnd + commute);
        if (startMin < postShiftBlockEnd && endMin > postShiftBlockStart) {
          return true;
        }
      }
    }

    return false;
  }

  private violatesCustomEventCommuteBuffer(
    day: number,
    startMin: number,
    endMin: number,
    alreadyPlaced: CalendarEvent[],
  ): boolean {
    const customEventsOnDay = alreadyPlaced.filter(
      (event) => event.day === day && event.type === 'custom-event',
    );

    for (const customEvent of customEventsOnDay) {
      const commute = customEvent.commuteMinutes ?? 0;

      if (commute <= 0) {
        continue;
      }

      const eventStart = toMinutes(customEvent.startTime);
      const eventEnd = toMinutes(customEvent.endTime);

      const preEventBlockStart = Math.max(0, eventStart - commute);
      const preEventBlockEnd = eventStart;

      if (startMin < preEventBlockEnd && endMin > preEventBlockStart) {
        return true;
      }

      const postEventBlockStart = eventEnd;
      const postEventBlockEnd = Math.min(24 * 60, eventEnd + commute);
      if (startMin < postEventBlockEnd && endMin > postEventBlockStart) {
        return true;
      }
    }

    return false;
  }

  isEnduranceNeedingRestDay(workout: Workout, settings: SchedulerSettings): boolean {
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
      workout.distanceKm !== undefined &&
      workout.distanceKm >= threshold.distanceKm &&
      workout.distanceCountsAsLong !== false;

    return durationExceeds || distanceExceeds;
  }

  private nextDayHasActivity(day: number, alreadyPlaced: CalendarEvent[]): boolean {
    const nextDay = day + 1;
    if (nextDay > 6) {
      return false;
    }
    return alreadyPlaced.some((e) => e.day === nextDay && e.type === 'workout');
  }

  private previousDayIsIntensiveWorkout(
    day: number,
    alreadyPlaced: CalendarEvent[],
    settings: SchedulerSettings,
  ): boolean {
    const restDays = settings.enduranceRestDays ?? 1;

    for (let i = 1; i <= restDays; i++) {
      const checkDay = day - i;
      if (checkDay < 0) {
        continue;
      }
      const checkDayWorkouts = alreadyPlaced.filter(
        (e) => e.day === checkDay && e.type === 'workout',
      );

      for (const workoutEvent of checkDayWorkouts) {
        if (!workoutEvent.workoutType || !isEnduranceType(workoutEvent.workoutType)) {
          continue;
        }

        const threshold =
          settings.enduranceThresholds[
            workoutEvent.workoutType as 'running' | 'biking' | 'swimming'
          ];
        if (!threshold) {
          continue;
        }

        const durationExceeds = (workoutEvent.durationMinutes ?? 0) >= threshold.durationMin;
        const distanceExceeds =
          workoutEvent.distanceKm !== undefined &&
          workoutEvent.distanceKm >= threshold.distanceKm &&
          workoutEvent.distanceCountsAsLong !== false;

        if (durationExceeds || distanceExceeds) {
          return true;
        }
      }
    }

    return false;
  }

  private nextDaysHaveIntensiveWorkout(
    day: number,
    alreadyPlaced: CalendarEvent[],
    settings: SchedulerSettings,
  ): boolean {
    const restDays = settings.enduranceRestDays ?? 1;

    for (let i = 1; i <= restDays; i++) {
      const checkDay = day + i;
      if (checkDay > 6) {
        continue;
      }
      const checkDayWorkouts = alreadyPlaced.filter(
        (e) => e.day === checkDay && e.type === 'workout',
      );

      for (const workoutEvent of checkDayWorkouts) {
        if (!workoutEvent.workoutType || !isEnduranceType(workoutEvent.workoutType)) {
          continue;
        }

        const threshold =
          settings.enduranceThresholds[
            workoutEvent.workoutType as 'running' | 'biking' | 'swimming'
          ];
        if (!threshold) {
          continue;
        }

        const durationExceeds = (workoutEvent.durationMinutes ?? 0) >= threshold.durationMin;
        const distanceExceeds =
          workoutEvent.distanceKm !== undefined &&
          workoutEvent.distanceKm >= threshold.distanceKm &&
          workoutEvent.distanceCountsAsLong !== false;

        if (durationExceeds || distanceExceeds) {
          return true;
        }
      }
    }

    return false;
  }

  private hasConsecutiveMealPrep(day: number, ctx: ConstraintContext): boolean {
    const minGap = ctx.minDaysBetweenMealPrepSessions ?? 1;
    const allMealPreps = ctx.alreadyPlaced.filter((e) => e.type === 'mealprep');
    return allMealPreps.some((e) => Math.abs(e.day - day) <= minGap);
  }

  private violatesIntensiveDayWorkoutRule(
    day: number,
    workout: Workout,
    ctx: ConstraintContext,
  ): boolean {
    const sameDayWorkouts = ctx.alreadyPlaced.filter((e) => e.type === 'workout' && e.day === day);
    if (sameDayWorkouts.length === 0) {
      return false;
    }

    const candidateIsLongEndurance = this.isEnduranceNeedingRestDay(workout, ctx.settings);
    if (candidateIsLongEndurance) {
      return true;
    }

    const isLongEndurance = (event: CalendarEvent): boolean => {
      if (!event.workoutType || !isEnduranceType(event.workoutType)) {
        return false;
      }
      const threshold =
        ctx.settings.enduranceThresholds[event.workoutType as 'running' | 'biking' | 'swimming'];
      if (!threshold) {
        return false;
      }
      const durationExceeds = (event.durationMinutes ?? 0) >= threshold.durationMin;
      const distanceExceeds =
        event.distanceKm !== undefined &&
        event.distanceKm >= threshold.distanceKm &&
        event.distanceCountsAsLong !== false;
      return durationExceeds || distanceExceeds;
    };

    for (const event of sameDayWorkouts) {
      if (isLongEndurance(event)) {
        return true;
      }
    }

    return false;
  }

  private violatesMinimumRestBetweenWorkouts(
    day: number,
    startMin: number,
    alreadyPlaced: CalendarEvent[],
  ): boolean {
    const MIN_REST_MINUTES = 180;

    const sameDayWorkouts = alreadyPlaced.filter((e) => e.type === 'workout' && e.day === day);

    for (const workout of sameDayWorkouts) {
      const workoutStart = toMinutes(workout.startTime);
      const workoutEnd = toMinutes(workout.endTime);

      const tooCloseAfter = startMin < workoutEnd + MIN_REST_MINUTES && startMin >= workoutEnd;
      const tooCloseBefore =
        startMin + MIN_REST_MINUTES > workoutStart && startMin + MIN_REST_MINUTES <= workoutStart;

      if (tooCloseAfter || tooCloseBefore) {
        return true;
      }
    }

    return false;
  }

  private violatesSameTypeOnSameDay(
    day: number,
    workout: Workout,
    alreadyPlaced: CalendarEvent[],
  ): boolean {
    const sameDayWorkouts = alreadyPlaced.filter((e) => e.type === 'workout' && e.day === day);

    for (const existing of sameDayWorkouts) {
      if (existing.workoutType === workout.workoutType) {
        return true;
      }
    }

    return false;
  }
}
