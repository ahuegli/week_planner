import { Injectable, computed, signal } from '@angular/core';
import { CalendarEvent } from '../models/calendar-event.model';
import { MealPrep } from '../models/mealprep.model';
import { SHIFT_DEFINITIONS, ShiftType } from '../models/shift.model';
import { Workout } from '../models/workout.model';
import { addMinutes } from '../utils/time-utils';
import { ScheduleGeneratorService } from './schedule-generator.service';

@Injectable({
  providedIn: 'root',
})
export class PlannerService {
  private readonly workoutsSignal = signal<Workout[]>([]);
  private readonly mealPrepSignal = signal<MealPrep>({ duration: 90, sessionsPerWeek: 2 });
  private readonly eventsSignal = signal<CalendarEvent[]>([]);

  readonly workouts = this.workoutsSignal.asReadonly();
  readonly mealPrep = this.mealPrepSignal.asReadonly();
  readonly events = this.eventsSignal.asReadonly();
  readonly eventsByDay = computed(() => {
    return Array.from({ length: 7 }, (_, day) =>
      this.eventsSignal()
        .filter((event) => event.day === day)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    );
  });

  constructor(private readonly scheduleGenerator: ScheduleGeneratorService) {}

  addShift(day: number, shiftType: ShiftType): void {
    const shift = SHIFT_DEFINITIONS[shiftType];
    const event: CalendarEvent = {
      id: crypto.randomUUID(),
      title: `${shift.type.toUpperCase()} Shift`,
      type: 'shift',
      shiftType: shift.type,
      day,
      startTime: shift.start,
      endTime: shift.end,
    };

    this.eventsSignal.update((current) => [...current, event]);
  }

  addWorkout(name: string, duration: number, frequencyPerWeek: number): void {
    const workout: Workout = {
      id: crypto.randomUUID(),
      name,
      duration,
      frequencyPerWeek,
    };
    this.workoutsSignal.update((current) => [...current, workout]);
  }

  setMealPrep(config: MealPrep): void {
    this.mealPrepSignal.set(config);
  }

  addManualEvent(day: number, type: 'workout' | 'mealprep', title: string, duration: number): void {
    const startTime = '18:00';
    const event: CalendarEvent = {
      id: crypto.randomUUID(),
      title,
      type,
      day,
      startTime,
      endTime: addMinutes(startTime, duration),
      durationMinutes: duration,
    };

    this.eventsSignal.update((current) => [...current, event]);
  }

  moveEvent(eventId: string, targetDay: number): void {
    this.eventsSignal.update((events) =>
      events.map((event) => (event.id === eventId ? { ...event, day: targetDay } : event)),
    );
  }

  removeEvent(eventId: string): void {
    this.eventsSignal.update((events) => events.filter((event) => event.id !== eventId));
  }

  clearGeneratedEvents(): void {
    this.eventsSignal.update((events) => events.filter((event) => event.type === 'shift'));
  }

  generateSuggestedPlan(): void {
    const generated = this.scheduleGenerator.generate({
      existingEvents: this.eventsSignal(),
      workouts: this.workoutsSignal(),
      mealPrep: this.mealPrepSignal(),
    });

    this.eventsSignal.update((events) => {
      const shiftsOnly = events.filter((event) => event.type === 'shift');
      return [...shiftsOnly, ...generated];
    });
  }
}
