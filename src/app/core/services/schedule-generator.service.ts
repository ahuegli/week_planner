import { Injectable } from '@angular/core';
import { CalendarEvent } from '../models/calendar-event.model';
import { MealPrep } from '../models/mealprep.model';
import { Workout } from '../models/workout.model';
import { addMinutes, eventIntervals, overlaps, TimeInterval, toMinutes } from '../utils/time-utils';

interface GenerationInput {
  existingEvents: CalendarEvent[];
  workouts: Workout[];
  mealPrep: MealPrep;
}

@Injectable({
  providedIn: 'root',
})
export class ScheduleGeneratorService {
  generate(input: GenerationInput): CalendarEvent[] {
    const shiftEvents = input.existingEvents.filter((event) => event.type === 'shift');
    const generatedEvents: CalendarEvent[] = [];
    const occupied = shiftEvents.flatMap((event) => eventIntervals(event));

    const workoutSessions = input.workouts.flatMap((workout) =>
      Array.from({ length: workout.frequencyPerWeek }, (_, index) => ({
        workout,
        index,
      })),
    );

    for (const session of workoutSessions) {
      const event = this.placeWorkout(
        session.workout,
        shiftEvents,
        occupied,
        generatedEvents,
        session.index,
      );
      if (event) {
        generatedEvents.push(event);
        occupied.push(...eventIntervals(event));
      }
    }

    for (let i = 0; i < input.mealPrep.sessionsPerWeek; i += 1) {
      const mealEvent = this.placeMealPrep(input.mealPrep, shiftEvents, occupied, i);
      if (mealEvent) {
        generatedEvents.push(mealEvent);
        occupied.push(...eventIntervals(mealEvent));
      }
    }

    return generatedEvents;
  }

  private placeWorkout(
    workout: Workout,
    shifts: CalendarEvent[],
    occupied: TimeInterval[],
    generatedEvents: CalendarEvent[],
    sessionIndex: number,
  ): CalendarEvent | null {
    const dayOrder = this.getDistributedDayOrder(workout.frequencyPerWeek, sessionIndex);

    for (const day of dayOrder) {
      if (this.isMorningAfterNightShift(day, shifts)) {
        continue;
      }

      const start = this.findStartTime(day, workout.duration, occupied, [8 * 60, 12 * 60, 17 * 60]);
      if (start === null) {
        continue;
      }

      const startTime = this.minutesToString(start);
      return {
        id: crypto.randomUUID(),
        title: workout.name,
        type: 'workout',
        day,
        startTime,
        endTime: addMinutes(startTime, workout.duration),
        durationMinutes: workout.duration,
      };
    }

    const fallbackDay = this.findLeastBusyDay(occupied);
    const fallbackStart = this.findStartTime(fallbackDay, workout.duration, occupied, [
      12 * 60,
      18 * 60,
    ]);
    if (fallbackStart === null) {
      return null;
    }

    const fallbackStartTime = this.minutesToString(fallbackStart);
    return {
      id: crypto.randomUUID(),
      title: workout.name,
      type: 'workout',
      day: fallbackDay,
      startTime: fallbackStartTime,
      endTime: addMinutes(fallbackStartTime, workout.duration),
      durationMinutes: workout.duration,
    };
  }

  private placeMealPrep(
    mealPrep: MealPrep,
    shifts: CalendarEvent[],
    occupied: TimeInterval[],
    sessionIndex: number,
  ): CalendarEvent | null {
    const daysWithoutShift = Array.from({ length: 7 }, (_, day) => day).filter(
      (day) => !shifts.some((shift) => shift.day === day),
    );
    const allDays = Array.from({ length: 7 }, (_, day) => day);
    const preferredDays = daysWithoutShift.length > 0 ? daysWithoutShift : allDays;
    const dayOrder = [
      ...preferredDays.slice(sessionIndex),
      ...preferredDays.slice(0, sessionIndex),
    ];

    for (const day of dayOrder) {
      const start = this.findStartTime(day, mealPrep.duration, occupied, [
        10 * 60,
        16 * 60,
        19 * 60,
      ]);
      if (start === null) {
        continue;
      }

      const startTime = this.minutesToString(start);
      return {
        id: crypto.randomUUID(),
        title: 'Meal Prep',
        type: 'mealprep',
        day,
        startTime,
        endTime: addMinutes(startTime, mealPrep.duration),
        durationMinutes: mealPrep.duration,
      };
    }

    return null;
  }

  private findStartTime(
    day: number,
    duration: number,
    occupied: TimeInterval[],
    anchors: number[],
  ): number | null {
    const dayOccupied = occupied.filter((slot) => slot.day === day);

    for (const anchor of anchors) {
      if (this.slotAvailable(day, anchor, anchor + duration, dayOccupied)) {
        return anchor;
      }
    }

    for (let minute = 6 * 60; minute <= 21 * 60; minute += 30) {
      if (this.slotAvailable(day, minute, minute + duration, dayOccupied)) {
        return minute;
      }
    }

    return null;
  }

  private slotAvailable(
    day: number,
    start: number,
    end: number,
    dayOccupied: TimeInterval[],
  ): boolean {
    if (end > 24 * 60) {
      return false;
    }

    const candidate: TimeInterval = { day, start, end };
    return !dayOccupied.some((occupiedSlot) => overlaps(candidate, occupiedSlot));
  }

  private isMorningAfterNightShift(day: number, shifts: CalendarEvent[]): boolean {
    const previousDay = (day + 6) % 7;
    return shifts.some((shift) => shift.day === previousDay && shift.shiftType === 'night');
  }

  private getDistributedDayOrder(totalSessions: number, sessionIndex: number): number[] {
    if (totalSessions <= 1) {
      return [sessionIndex % 7, 2, 4, 6, 1, 3, 5].slice(0, 7);
    }

    const dayGap = Math.max(1, Math.floor(7 / totalSessions));
    const preferredStart = (sessionIndex * dayGap) % 7;
    const ordered = Array.from({ length: 7 }, (_, offset) => (preferredStart + offset) % 7);

    return ordered;
  }

  private findLeastBusyDay(occupied: TimeInterval[]): number {
    const totals = Array.from({ length: 7 }, (_, day) => ({
      day,
      minutes: occupied
        .filter((slot) => slot.day === day)
        .reduce((sum, slot) => sum + (slot.end - slot.start), 0),
    }));

    totals.sort((a, b) => a.minutes - b.minutes);
    return totals[0].day;
  }

  private minutesToString(minutes: number): string {
    const hours = Math.floor(minutes / 60)
      .toString()
      .padStart(2, '0');
    const remaining = (minutes % 60).toString().padStart(2, '0');
    return `${hours}:${remaining}`;
  }
}
