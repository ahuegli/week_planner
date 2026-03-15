import { Injectable, computed, signal } from '@angular/core';
import { CalendarEvent } from '../models/calendar-event.model';
import { MealPrep } from '../models/mealprep.model';
import { DEFAULT_SETTINGS, SchedulerSettings } from '../models/scheduler-settings.model';
import { SHIFT_DEFINITIONS, ShiftType } from '../models/shift.model';
import { DEFAULT_WEEK_CONTEXT, WeekContext } from '../models/week context.model';
import { Workout, WorkoutType } from '../models/workout.model';
import { addMinutes } from '../utils/time-utils';
import { ScheduleGeneratorService } from './schedule-generator.service';

@Injectable({
  providedIn: 'root',
})
export class PlannerService {
  private readonly workoutsSignal = signal<Workout[]>([]);
  private readonly mealPrepSignal = signal<MealPrep>({ duration: 90, sessionsPerWeek: 2 });
  private readonly eventsSignal = signal<CalendarEvent[]>([]);
  private readonly settingsSignal = signal<SchedulerSettings>(DEFAULT_SETTINGS);
  private readonly weekContextSignal = signal<WeekContext>(DEFAULT_WEEK_CONTEXT);

  readonly workouts = this.workoutsSignal.asReadonly();
  readonly mealPrep = this.mealPrepSignal.asReadonly();
  readonly events = this.eventsSignal.asReadonly();
  readonly settings = this.settingsSignal.asReadonly();
  readonly weekContext = this.weekContextSignal.asReadonly();

  readonly eventsByDay = computed(() =>
    Array.from({ length: 7 }, (_, day) =>
      this.eventsSignal()
        .filter((event) => event.day === day)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    ),
  );

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

  addWorkout(
    workoutType: WorkoutType,
    name: string,
    duration: number,
    frequencyPerWeek: number,
    distanceKm?: number,
  ): void {
    const workout: Workout = {
      id: crypto.randomUUID(),
      workoutType,
      name,
      duration,
      frequencyPerWeek,
      distanceKm,
    };
    this.workoutsSignal.update((current) => [...current, workout]);
  }

  removeWorkout(id: string): void {
    this.workoutsSignal.update((workouts) => workouts.filter((w) => w.id !== id));
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
      events.map((event) =>
        event.id === eventId ? { ...event, day: targetDay, isLocked: true } : event,
      ),
    );
  }

  removeEvent(eventId: string): void {
    this.eventsSignal.update((events) => events.filter((event) => event.id !== eventId));
  }

  clearGeneratedEvents(): void {
    this.eventsSignal.update((events) => events.filter((event) => event.type === 'shift'));
  }

  updateSettings(patch: Partial<SchedulerSettings>): void {
    this.settingsSignal.update((current) => ({ ...current, ...patch }));
  }

  updateExhaustion(day: number, value: number): void {
    this.weekContextSignal.update((current) => {
      const updated = [...current.exhaustionByDay];
      updated[day] = Math.min(10, Math.max(0, value));
      return { ...current, exhaustionByDay: updated };
    });
  }

  updateCommute(day: number, hasCommute: boolean): void {
    this.weekContextSignal.update((current) => {
      const updated = [...current.commuteByDay];
      updated[day] = hasCommute;
      return { ...current, commuteByDay: updated };
    });
  }

  addPersonalEvent(event: CalendarEvent): void {
    const personal: CalendarEvent = { ...event, isPersonal: true };
    this.eventsSignal.update((current) => [...current, personal]);
    this.weekContextSignal.update((current) => ({
      ...current,
      personalEvents: [...current.personalEvents, personal],
    }));
  }

  generateSuggestedPlan(): void {
    const generated = this.scheduleGenerator.generate({
      existingEvents: this.eventsSignal(),
      workouts: this.workoutsSignal(),
      mealPrep: this.mealPrepSignal(),
      settings: this.settingsSignal(),
      weekContext: this.weekContextSignal(),
    });

    this.eventsSignal.update((events) => {
      const preserved = events.filter((e) => e.type === 'shift' || e.isLocked || e.isPersonal);
      return [...preserved, ...generated];
    });
  }
}