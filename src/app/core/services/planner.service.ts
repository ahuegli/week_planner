import { Injectable, computed, signal } from '@angular/core';
import { CalendarEvent } from '../models/calendar-event.model';
import { CustomEvent } from '../models/custom-event.model';
import { CustomShift } from '../models/custom-shift.model';
import { MealPrepSession } from '../models/mealprep.model';
import { DEFAULT_SETTINGS, SchedulerSettings } from '../models/scheduler-settings.model';
import { SHIFT_DEFINITIONS, ShiftType } from '../models/shift.model';
import { DEFAULT_WEEK_CONTEXT, WeekContext } from '../models/week context.model';
import { Workout, WorkoutType } from '../models/workout.model';
import { addMinutes, toMinutes } from '../utils/time-utils';
import {
  GenerateScheduleResponse,
  SchedulerApiService,
  UnplacedWorkout,
} from './scheduler-api.service';
import { WorkoutApiService } from './workout-api.service';
import { CalendarEventApiService, CreateCalendarEventDto } from './calendar-event-api.service';
import { firstValueFrom } from 'rxjs';

export interface OptimizationProposal {
  conflictEvents: CalendarEvent[];
  baseEvents: CalendarEvent[];
  baselineUnplacedCount: number;
  improvedUnplacedCount: number;
  conflictGains: Record<
    string,
    { placedWorkoutDelta: number; weightedDelta: number; scoreDelta: number }
  >;
  conflictMoves: Record<string, { current: string; change: string }>;
}

@Injectable({
  providedIn: 'root',
})
export class PlannerService {
  private readonly dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  private readonly LONG_FEASIBLE_TOLERANCE = 1;

  private readonly workoutsSignal = signal<Workout[]>([]);
  private readonly mealPrepSessionsSignal = signal<MealPrepSession[]>([]);
  private readonly eventsSignal = signal<CalendarEvent[]>([]);
  private readonly settingsSignal = signal<SchedulerSettings>(DEFAULT_SETTINGS);
  private readonly weekContextSignal = signal<WeekContext>(DEFAULT_WEEK_CONTEXT);
  private readonly customEventsSignal = signal<CustomEvent[]>([]);
  private readonly customShiftsSignal = signal<CustomShift[]>([]);
  private readonly unplacedWorkoutsSignal = signal<UnplacedWorkout[]>([]);
  private readonly optimizationProposalSignal = signal<OptimizationProposal | null>(null);

  readonly workouts = this.workoutsSignal.asReadonly();
  readonly mealPrepSessions = this.mealPrepSessionsSignal.asReadonly();
  readonly events = this.eventsSignal.asReadonly();
  readonly settings = this.settingsSignal.asReadonly();
  readonly weekContext = this.weekContextSignal.asReadonly();
  readonly customEvents = this.customEventsSignal.asReadonly();
  readonly unplacedWorkouts = this.unplacedWorkoutsSignal.asReadonly();
  readonly customShifts = this.customShiftsSignal.asReadonly();
  readonly optimizationProposal = this.optimizationProposalSignal.asReadonly();

  readonly eventsByDay = computed(() =>
    Array.from({ length: 7 }, (_, day) =>
      this.eventsSignal()
        .filter((event) => event.day === day)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    ),
  );

  constructor(
    private readonly schedulerApi: SchedulerApiService,
    private readonly workoutApi: WorkoutApiService,
    private readonly calendarEventApi: CalendarEventApiService,
  ) {}

  // ========== Date Utility Methods ==========

  /**
   * Get the Monday of the week for a given date
   */
  getWeekStartDate(date: Date = new Date()): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Get the Sunday of the week for a given date
   */
  getWeekEndDate(date: Date = new Date()): Date {
    const start = this.getWeekStartDate(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return end;
  }

  /**
   * Format a date as YYYY-MM-DD
   */
  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Parse a YYYY-MM-DD string to Date
   */
  parseDate(dateStr: string): Date {
    return new Date(dateStr + 'T00:00:00');
  }

  /**
   * Get the day of week index (0=Mon, 6=Sun) from a date
   */
  getDayOfWeek(date: Date): number {
    const jsDay = date.getDay();
    return jsDay === 0 ? 6 : jsDay - 1;
  }

  /**
   * Get date for a specific day index within a week that starts on the given Monday
   */
  getDateForDayInWeek(weekStart: Date, dayIndex: number): Date {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + dayIndex);
    return date;
  }

  /**
   * Calculate week offset from current week
   */
  getWeekOffsetFromDate(date: Date): number {
    const now = new Date();
    const currentWeekStart = this.getWeekStartDate(now);
    const targetWeekStart = this.getWeekStartDate(date);
    const diffTime = targetWeekStart.getTime() - currentWeekStart.getTime();
    return Math.round(diffTime / (7 * 24 * 60 * 60 * 1000));
  }

  // ========== Data Loading Methods ==========

  async loadWorkouts(): Promise<void> {
    try {
      const workouts = await firstValueFrom(this.workoutApi.getAll());
      this.workoutsSignal.set(workouts);
    } catch (error) {
      console.error('Failed to load workouts:', error);
    }
  }

  async loadCalendarEvents(startDate?: Date, endDate?: Date): Promise<void> {
    try {
      let events: CalendarEvent[];
      if (startDate && endDate) {
        events = await firstValueFrom(
          this.calendarEventApi.getByDateRange(
            this.formatDate(startDate),
            this.formatDate(endDate)
          )
        );
      } else {
        events = await firstValueFrom(this.calendarEventApi.getAll());
      }
      
      // Ensure day field is computed from date if not present
      const processedEvents = events.map(event => {
        if (event.date && event.day === undefined) {
          return { ...event, day: this.getDayOfWeek(this.parseDate(event.date)) };
        }
        return event;
      });
      
      this.eventsSignal.set(processedEvents);
    } catch (error) {
      console.error('Failed to load calendar events:', error);
    }
  }

  async loadEventsForWeek(weekOffset: number = 0): Promise<void> {
    const now = new Date();
    const weekStart = this.getWeekStartDate(now);
    weekStart.setDate(weekStart.getDate() + weekOffset * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    await this.loadCalendarEvents(weekStart, weekEnd);
  }

  clearAllData(): void {
    this.workoutsSignal.set([]);
    this.mealPrepSessionsSignal.set([]);
    this.eventsSignal.set([]);
    this.customEventsSignal.set([]);
    this.customShiftsSignal.set([]);
    this.unplacedWorkoutsSignal.set([]);
    this.optimizationProposalSignal.set(null);
  }

  // ========== Event Management Methods ==========

  private toCreateDto(event: CalendarEvent): CreateCalendarEventDto {
    return {
      title: event.title,
      type: event.type,
      day: event.day,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      durationMinutes: event.durationMinutes,
      shiftType: event.shiftType,
      workoutType: event.workoutType,
      distanceKm: event.distanceKm,
      isLocked: event.isLocked,
      isPersonal: event.isPersonal,
      isManuallyPlaced: event.isManuallyPlaced,
      isRepeatingWeekly: event.isRepeatingWeekly,
      commuteMinutes: event.commuteMinutes,
      notes: event.notes,
    };
  }

  async addShift(day: number, shiftType: ShiftType, weekOffset?: number): Promise<void> {
    const shift = SHIFT_DEFINITIONS[shiftType];
    
    // Calculate actual date
    const weekStart = this.getWeekStartDate();
    if (weekOffset) {
      weekStart.setDate(weekStart.getDate() + weekOffset * 7);
    }
    const eventDate = this.getDateForDayInWeek(weekStart, day);
    
    const event: CalendarEvent = {
      id: crypto.randomUUID(),
      title: `${shift.type.toUpperCase()} Shift`,
      type: 'shift',
      shiftType: shift.type,
      day,
      date: this.formatDate(eventDate),
      startTime: shift.start,
      endTime: shift.end,
    };
    
    // Optimistically add to local state
    this.eventsSignal.update((current) => [...current, event]);
    
    // Sync with backend
    try {
      const savedEvent = await firstValueFrom(this.calendarEventApi.create(this.toCreateDto(event)));
      this.eventsSignal.update((events) =>
        events.map((e) => (e.id === event.id ? { ...e, id: savedEvent.id } : e)),
      );
    } catch (error) {
      console.error('Failed to save shift to backend:', error);
    }
  }

  async addWorkout(
    workoutType: WorkoutType,
    name: string,
    duration: number,
    frequencyPerWeek: number,
    distanceKm?: number,
    distanceCountsAsLong?: boolean,
  ): Promise<void> {
    try {
      const workout = await firstValueFrom(
        this.workoutApi.create({
          workoutType,
          name,
          duration,
          frequencyPerWeek,
          distanceKm,
        }),
      );
      // Add distanceCountsAsLong locally (not persisted in backend)
      const workoutWithLocal: Workout = { ...workout, distanceCountsAsLong };
      this.workoutsSignal.update((current) => [...current, workoutWithLocal]);
    } catch (error) {
      console.error('Failed to create workout:', error);
      // Fallback to local-only if API fails
      const workout: Workout = {
        id: crypto.randomUUID(),
        workoutType,
        name,
        duration,
        frequencyPerWeek,
        distanceKm,
        distanceCountsAsLong,
      };
      this.workoutsSignal.update((current) => [...current, workout]);
    }
  }

  async removeWorkout(id: string): Promise<void> {
    try {
      await firstValueFrom(this.workoutApi.delete(id));
    } catch (error) {
      console.error('Failed to delete workout from API:', error);
    }
    this.workoutsSignal.update((workouts) => workouts.filter((w) => w.id !== id));
  }

  async decreaseWorkoutFrequency(id: string): Promise<void> {
    const workout = this.workoutsSignal().find((w) => w.id === id);
    if (!workout) return;

    const newFrequency = Math.max(0, workout.frequencyPerWeek - 1);

    if (newFrequency === 0) {
      // Delete the workout entirely
      await this.removeWorkout(id);
    } else {
      // Update the frequency
      try {
        await firstValueFrom(this.workoutApi.update(id, { frequencyPerWeek: newFrequency }));
      } catch (error) {
        console.error('Failed to update workout frequency:', error);
      }
      this.workoutsSignal.update((workouts) =>
        workouts.map((w) => (w.id === id ? { ...w, frequencyPerWeek: newFrequency } : w)),
      );
    }
  }

  addMealPrepSession(
    name: string,
    duration: number,
    frequencyPerWeek: number,
    daysPreppedFor: number,
  ): void {
    const session: MealPrepSession = {
      id: crypto.randomUUID(),
      name,
      duration,
      frequencyPerWeek,
      daysPreppedFor,
    };
    this.mealPrepSessionsSignal.update((current) => [...current, session]);
  }

  removeMealPrepSession(id: string): void {
    this.mealPrepSessionsSignal.update((sessions) => sessions.filter((s) => s.id !== id));
  }

  async addManualEvent(
    day: number,
    type: 'workout' | 'mealprep',
    title: string,
    duration: number,
    workoutType?: WorkoutType,
    distanceKm?: number,
    distanceCountsAsLong?: boolean,
    startTimeMinutes?: number,
    weekOffset?: number,
    date?: string,
  ): Promise<void> {
    let startTime = '18:00'; // Default to 6pm

    // Convert startTimeMinutes to HH:MM format if provided
    if (startTimeMinutes !== undefined) {
      const hours = Math.floor(startTimeMinutes / 60);
      const minutes = startTimeMinutes % 60;
      startTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    // Calculate actual date if not provided
    let eventDate = date;
    if (!eventDate && weekOffset !== undefined) {
      const weekStart = this.getWeekStartDate();
      weekStart.setDate(weekStart.getDate() + weekOffset * 7 + day);
      eventDate = this.formatDate(weekStart);
    } else if (!eventDate) {
      const weekStart = this.getWeekStartDate();
      weekStart.setDate(weekStart.getDate() + day);
      eventDate = this.formatDate(weekStart);
    }

    const event: CalendarEvent = {
      id: crypto.randomUUID(),
      title,
      type,
      day,
      date: eventDate,
      startTime,
      endTime: addMinutes(startTime, duration),
      durationMinutes: duration,
      workoutType,
      distanceKm,
      distanceCountsAsLong,
      isLocked: true, // Mark as fixed so smart plan does not reallocate
      isManuallyPlaced: true, // Mark as manually placed by user
    };

    // Optimistically add to local state
    this.eventsSignal.update((current) => [...current, event]);

    // Sync with backend
    try {
      const savedEvent = await firstValueFrom(this.calendarEventApi.create(this.toCreateDto(event)));
      // Update with server-assigned ID
      this.eventsSignal.update((events) =>
        events.map((e) => (e.id === event.id ? { ...e, id: savedEvent.id } : e)),
      );
    } catch (error) {
      console.error('Failed to save event to backend:', error);
      // Keep local event even if backend fails
    }
  }

  async moveEvent(eventId: string, targetDay: number, targetDate?: string): Promise<void> {
    const currentEvent = this.eventsSignal().find((e) => e.id === eventId);
    if (!currentEvent) return;

    // Calculate new date if not provided
    let newDate = targetDate;
    if (!newDate && currentEvent.date) {
      // Keep the same week, just change the day
      const eventDate = this.parseDate(currentEvent.date);
      const eventWeekStart = this.getWeekStartDate(eventDate);
      const newEventDate = this.getDateForDayInWeek(eventWeekStart, targetDay);
      newDate = this.formatDate(newEventDate);
    }

    // Optimistically update local state
    this.eventsSignal.update((events) =>
      events.map((event) =>
        event.id === eventId
          ? { ...event, day: targetDay, date: newDate, isLocked: true, isManuallyPlaced: true }
          : event,
      ),
    );

    // Sync with backend
    try {
      await firstValueFrom(
        this.calendarEventApi.update(eventId, { 
          day: targetDay, 
          date: newDate,
          isLocked: true, 
          isManuallyPlaced: true 
        }),
      );
    } catch (error) {
      console.error('Failed to update event in backend:', error);
    }
  }

  async updateEvent(updatedEvent: CalendarEvent): Promise<void> {
    // Optimistically update local state
    this.eventsSignal.update((events) =>
      events.map((event) => (event.id === updatedEvent.id ? updatedEvent : event)),
    );

    // Sync with backend
    try {
      await firstValueFrom(
        this.calendarEventApi.update(updatedEvent.id, this.toCreateDto(updatedEvent)),
      );
    } catch (error) {
      console.error('Failed to update event in backend:', error);
    }
  }

  async removeEvent(eventId: string): Promise<void> {
    // Optimistically remove from local state
    this.eventsSignal.update((events) => events.filter((event) => event.id !== eventId));

    // Sync with backend
    try {
      await firstValueFrom(this.calendarEventApi.delete(eventId));
    } catch (error) {
      console.error('Failed to delete event from backend:', error);
    }
  }

  clearGeneratedEvents(): void {
    this.clearOptimizationProposal();
    this.eventsSignal.update((events) =>
      events.filter((event) => event.type === 'shift' || event.type === 'custom-event'),
    );
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

  async addPersonalEvent(event: CalendarEvent): Promise<void> {
    const personal: CalendarEvent = { ...event, isPersonal: true };
    
    // Ensure date is set
    if (!personal.date && personal.day !== undefined) {
      const weekStart = this.getWeekStartDate();
      const eventDate = this.getDateForDayInWeek(weekStart, personal.day);
      personal.date = this.formatDate(eventDate);
    }
    
    // Optimistically add to local state
    this.eventsSignal.update((current) => [...current, personal]);
    this.weekContextSignal.update((current) => ({
      ...current,
      personalEvents: [...current.personalEvents, personal],
    }));
    
    // Sync with backend
    try {
      const savedEvent = await firstValueFrom(this.calendarEventApi.create(this.toCreateDto(personal)));
      this.eventsSignal.update((events) =>
        events.map((e) => (e.id === personal.id ? { ...e, id: savedEvent.id } : e)),
      );
    } catch (error) {
      console.error('Failed to save personal event to backend:', error);
    }
  }

  async addCalendarEventDirectly(event: CalendarEvent): Promise<void> {
    // Ensure date is set
    if (!event.date && event.day !== undefined) {
      const weekStart = this.getWeekStartDate();
      const eventDate = this.getDateForDayInWeek(weekStart, event.day);
      event = { ...event, date: this.formatDate(eventDate) };
    }
    
    // Optimistically add to local state
    this.eventsSignal.update((current) => [...current, event]);
    
    // Sync with backend
    try {
      const savedEvent = await firstValueFrom(this.calendarEventApi.create(this.toCreateDto(event)));
      this.eventsSignal.update((events) =>
        events.map((e) => (e.id === event.id ? { ...e, id: savedEvent.id } : e)),
      );
    } catch (error) {
      console.error('Failed to save event to backend:', error);
    }
  }

  async generateSuggestedPlan(weekOffset: number = 0): Promise<void> {
    this.clearOptimizationProposal();

    const { totalSessionsPerWeek, avgDuration } = this.getMealPrepGenerationConfig();
    
    // Calculate the week's date range
    const weekStart = this.getWeekStartDate();
    weekStart.setDate(weekStart.getDate() + weekOffset * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const startDateStr = this.formatDate(weekStart);
    const endDateStr = this.formatDate(weekEnd);

    try {
      const result = await firstValueFrom(
        this.schedulerApi.generate({
          existingEvents: this.eventsSignal(),
          workouts: this.workoutsSignal(),
          mealPrep: { duration: avgDuration, sessionsPerWeek: totalSessionsPerWeek },
          settings: this.settingsSignal(),
          weekContext: this.weekContextSignal(),
        }),
      );

      // Store unplaced workouts for display
      this.unplacedWorkoutsSignal.set(result.unplacedWorkouts);

      // Add dates to placed events and mark as locked
      const lockedPlacedEvents = result.placedEvents.map((e) => {
        const eventDate = this.getDateForDayInWeek(weekStart, e.day);
        return { 
          ...e, 
          isLocked: true, 
          date: this.formatDate(eventDate),
        };
      });

      // Update local state
      this.eventsSignal.update((events) => {
        const preserved = events.filter((e) => {
           // Keep events that have isRepeatingWeekly flag
           if (e.isRepeatingWeekly) return true;
           // Keep events from other weeks (check by date)
           if (e.date) {
             const eventDate = e.date;
             if (eventDate < startDateStr || eventDate > endDateStr) return true;
           }
           // For the target week: keep shifts, custom events, personal events
           if (e.type === 'shift' || e.type === 'custom-event') return true;
           if (e.isPersonal) return true;
           // Keep other locked non-workout/mealprep events
           if (e.isLocked && e.type !== 'workout' && e.type !== 'mealprep') return true;
           return false;
        });
        return [...preserved, ...lockedPlacedEvents];
      });
      
      // Sync generated events with backend
      try {
        // First, delete existing workout/mealprep events for this week in the backend
        await firstValueFrom(
          this.calendarEventApi.deleteByDateRange(startDateStr, endDateStr)
        ).catch(() => {}); // Ignore if endpoint doesn't exist
        
        // Then create the new placed events
        if (lockedPlacedEvents.length > 0) {
          await firstValueFrom(
            this.calendarEventApi.createMany(lockedPlacedEvents.map(e => this.toCreateDto(e)))
          );
        }
      } catch (error) {
        console.error('Failed to sync generated plan with backend:', error);
      }
    } catch (error) {
      console.error('Failed to generate schedule:', error);
    }
  }

  async addCustomEvent(customEvent: CustomEvent, days?: number[], weekOffset?: number): Promise<void> {
    this.customEventsSignal.update((current) => [...current, customEvent]);

    // Add calendar events for this custom event
    const daysToAdd = days ?? [0, 1, 2, 3, 4, 5, 6]; // All days if not specified
    
    const weekStart = this.getWeekStartDate();
    if (weekOffset) {
      weekStart.setDate(weekStart.getDate() + weekOffset * 7);
    }

    for (const day of daysToAdd) {
      const eventDate = this.getDateForDayInWeek(weekStart, day);
      const calendarEvent: CalendarEvent = {
        id: crypto.randomUUID(),
        title: customEvent.title,
        type: 'custom-event',
        day,
        date: this.formatDate(eventDate),
        startTime: customEvent.startTime,
        endTime: customEvent.endTime,
        notes: customEvent.notes,
        commuteMinutes: customEvent.commuteMinutes,
        isRepeatingWeekly: customEvent.isRepeatingWeekly,
        isLocked: true, // Custom events should not be moved by scheduler
      };
      
      // Optimistically add to local state
      this.eventsSignal.update((current) => [...current, calendarEvent]);
      
      // Sync with backend
      try {
        const savedEvent = await firstValueFrom(this.calendarEventApi.create(this.toCreateDto(calendarEvent)));
        this.eventsSignal.update((events) =>
          events.map((e) => (e.id === calendarEvent.id ? { ...e, id: savedEvent.id } : e)),
        );
      } catch (error) {
        console.error('Failed to save custom event to backend:', error);
      }
    }
  }

  async deleteCustomEvent(id: string): Promise<void> {
    const customEvent = this.customEventsSignal().find((ce) => ce.id === id);
    if (!customEvent) return;

    // Find all calendar events to delete
    const eventsToDelete = this.eventsSignal().filter(
      (e) => e.type === 'custom-event' && e.title === customEvent.title
    );

    this.customEventsSignal.update((events) => events.filter((e) => e.id !== id));
    // Remove all calendar events associated with this custom event
    this.eventsSignal.update((events) =>
      events.filter((e) => !(e.type === 'custom-event' && e.title === customEvent.title)),
    );
    
    // Sync with backend
    try {
      for (const event of eventsToDelete) {
        await firstValueFrom(this.calendarEventApi.delete(event.id));
      }
    } catch (error) {
      console.error('Failed to delete custom events from backend:', error);
    }
  }

  addCustomShiftDefinition(customShift: CustomShift): void {
    this.customShiftsSignal.update((current) => [...current, customShift]);
  }

  updateCustomShift(id: string, updated: CustomShift): void {
    const oldShift = this.customShiftsSignal().find((s) => s.id === id);
    if (!oldShift) return;

    this.customShiftsSignal.update((shifts) => shifts.map((s) => (s.id === id ? updated : s)));

    // Update all calendar events with this shift
    this.eventsSignal.update((events) =>
      events.map((e) =>
        e.type === 'shift' && e.title === oldShift.label
          ? {
              ...e,
              title: updated.label,
              startTime: updated.startTime,
              endTime: updated.endTime,
              commuteMinutes: updated.commuteMinutes,
            }
          : e,
      ),
    );
  }

  async deleteCustomShift(id: string): Promise<void> {
    const customShift = this.customShiftsSignal().find((cs) => cs.id === id);
    if (!customShift) return;

    // Find all calendar events to delete
    const eventsToDelete = this.eventsSignal().filter(
      (e) => e.type === 'shift' && e.title === customShift.label
    );

    this.customShiftsSignal.update((shifts) => shifts.filter((s) => s.id !== id));
    // Remove all calendar events associated with this custom shift
    this.eventsSignal.update((events) =>
      events.filter((e) => !(e.type === 'shift' && e.title === customShift.label)),
    );
    
    // Sync with backend
    try {
      for (const event of eventsToDelete) {
        await firstValueFrom(this.calendarEventApi.delete(event.id));
      }
    } catch (error) {
      console.error('Failed to delete shift events from backend:', error);
    }
  }

  async createShiftEvent(
    shiftLabel: string,
    startTime: string,
    endTime: string,
    day: number,
    commuteMinutes: number = 0,
    weekOffset?: number,
    date?: string,
  ): Promise<void> {
    // Calculate actual date if not provided
    let eventDate = date;
    if (!eventDate) {
      const weekStart = this.getWeekStartDate();
      if (weekOffset) {
        weekStart.setDate(weekStart.getDate() + weekOffset * 7);
      }
      const dateObj = this.getDateForDayInWeek(weekStart, day);
      eventDate = this.formatDate(dateObj);
    }
    
    const calendarEvent: CalendarEvent = {
      id: crypto.randomUUID(),
      title: shiftLabel,
      type: 'shift',
      day,
      date: eventDate,
      startTime,
      endTime,
      isLocked: true,
      commuteMinutes,
    };
    
    // Optimistically add to local state
    this.eventsSignal.update((current) => [...current, calendarEvent]);
    
    // Sync with backend
    try {
      const savedEvent = await firstValueFrom(this.calendarEventApi.create(this.toCreateDto(calendarEvent)));
      this.eventsSignal.update((events) =>
        events.map((e) => (e.id === calendarEvent.id ? { ...e, id: savedEvent.id } : e)),
      );
    } catch (error) {
      console.error('Failed to save shift event to backend:', error);
    }
  }

  async updateEventCommute(eventId: string, commuteMinutes: number): Promise<void> {
    // Optimistically update local state
    this.eventsSignal.update((events) =>
      events.map((e) => (e.id === eventId ? { ...e, commuteMinutes } : e)),
    );
    
    // Sync with backend
    try {
      await firstValueFrom(this.calendarEventApi.update(eventId, { commuteMinutes }));
    } catch (error) {
      console.error('Failed to update event commute in backend:', error);
    }
  }

  async updateEventCommuteByShift(
    shiftLabel: string,
    shiftStartTime: string,
    commuteMinutes: number,
  ): Promise<void> {
    // Update all matching events locally
    const matchingEvents = this.eventsSignal().filter(
      (e) => e.type === 'shift' && e.title === shiftLabel && e.startTime === shiftStartTime
    );
    
    this.eventsSignal.update((events) =>
      events.map((e) =>
        e.type === 'shift' && e.title === shiftLabel && e.startTime === shiftStartTime
          ? { ...e, commuteMinutes }
          : e,
      ),
    );
    
    // Sync with backend
    try {
      for (const event of matchingEvents) {
        await firstValueFrom(this.calendarEventApi.update(event.id, { commuteMinutes }));
      }
    } catch (error) {
      console.error('Failed to update shift commute in backend:', error);
    }
  }

  removeFirstUnplacedWorkout(workoutId: string): void {
    this.unplacedWorkoutsSignal.update((workouts) => {
      const index = workouts.findIndex((w) => w.workoutId === workoutId);
      if (index >= 0) {
        return [...workouts.slice(0, index), ...workouts.slice(index + 1)];
      }
      return workouts;
    });
  }

  async optimizeSchedule(): Promise<void> {
    this.clearOptimizationProposal();

    const unplaced = this.unplacedWorkoutsSignal();
    if (unplaced.length === 0) {
      return; // Nothing to optimize
    }

    const currentEvents = this.eventsSignal();

    // Only get manually-placed events - these should block rest days and be preserved
    const eventsForGeneration = currentEvents.filter(
      (e) =>
        e.type === 'shift' ||
        e.type === 'custom-event' ||
        e.isPersonal ||
        (e.type === 'workout' && e.isManuallyPlaced) ||
        (e.type === 'mealprep' && e.isManuallyPlaced),
    );

    const manuallyPlacedWorkouts = eventsForGeneration.filter(
      (e) => e.type === 'workout' && e.isManuallyPlaced,
    );

    const { totalSessionsPerWeek, avgDuration } = this.getMealPrepGenerationConfig();

    try {
      // Re-run generation with only preserved events (no auto-generated ones from previous run)
      const baseline = await firstValueFrom(
        this.schedulerApi.generate({
          existingEvents: eventsForGeneration,
          workouts: this.workoutsSignal(),
          mealPrep: { duration: avgDuration, sessionsPerWeek: totalSessionsPerWeek },
          settings: this.settingsSignal(),
          weekContext: this.weekContextSignal(),
        }),
      );

      if (baseline.unplacedWorkouts.length === 0) {
        this.unplacedWorkoutsSignal.set([]);
        this.eventsSignal.set([...eventsForGeneration, ...baseline.placedEvents]);
        return;
      }

      const manualCandidates = manuallyPlacedWorkouts.slice(0, 8);
      const subsets = this.buildRemovableSubsets(manualCandidates, 3);

      const generationOptions: Array<{
        result: GenerateScheduleResponse;
        removedIds: Set<string>;
      }> = [{ result: baseline, removedIds: new Set<string>() }];

      for (const subset of subsets) {
        const removedIds = new Set(subset.map((e) => e.id));
        const eventsWithoutSubset = eventsForGeneration.filter((e) => !removedIds.has(e.id));
        const candidate = await firstValueFrom(
          this.schedulerApi.generate({
            existingEvents: eventsWithoutSubset,
            workouts: this.workoutsSignal(),
            mealPrep: { duration: avgDuration, sessionsPerWeek: totalSessionsPerWeek },
            settings: this.settingsSignal(),
            weekContext: this.weekContextSignal(),
          }),
        );

        generationOptions.push({ result: candidate, removedIds });
      }

      const bestOption = this.selectBestGenerationOption(generationOptions);
      const bestResult = bestOption?.result ?? baseline;
      const bestRemovedIds = bestOption?.removedIds ?? new Set<string>();

      if (bestRemovedIds.size > 0) {
        const conflicts = manualCandidates.filter((e) => bestRemovedIds.has(e.id));
        const conflictGains: Record<
          string,
          { placedWorkoutDelta: number; weightedDelta: number; scoreDelta: number }
        > = {};
        const conflictMoves = this.buildConflictMoves(conflicts, bestResult);

        for (const conflict of conflicts) {
          const eventsWithoutConflict = eventsForGeneration.filter(
            (event) => event.id !== conflict.id,
          );
          const soloResult = await firstValueFrom(
            this.schedulerApi.generate({
              existingEvents: eventsWithoutConflict,
              workouts: this.workoutsSignal(),
              mealPrep: { duration: avgDuration, sessionsPerWeek: totalSessionsPerWeek },
              settings: this.settingsSignal(),
              weekContext: this.weekContextSignal(),
            }),
          );

          conflictGains[conflict.id] = {
            placedWorkoutDelta: soloResult.placedWorkoutCount - baseline.placedWorkoutCount,
            weightedDelta: soloResult.weightedWorkoutScore - baseline.weightedWorkoutScore,
            scoreDelta: soloResult.totalScore - baseline.totalScore,
          };
        }

        this.markConflictEvents(bestRemovedIds);
        this.optimizationProposalSignal.set({
          conflictEvents: conflicts,
          baseEvents: eventsForGeneration,
          baselineUnplacedCount: baseline.unplacedWorkouts.length,
          improvedUnplacedCount: bestResult.unplacedWorkouts.length,
          conflictGains,
          conflictMoves,
        });
        this.unplacedWorkoutsSignal.set(baseline.unplacedWorkouts);
        return;
      }

      this.unplacedWorkoutsSignal.set(baseline.unplacedWorkouts);
      this.eventsSignal.set([...eventsForGeneration, ...baseline.placedEvents]);
    } catch (error) {
      console.error('Failed to optimize schedule:', error);
    }
  }

  async applyOptimizationSelection(selectedRescheduleIds: string[]): Promise<void> {
    const proposal = this.optimizationProposalSignal();
    if (!proposal) {
      return;
    }

    const removedIds = new Set(selectedRescheduleIds);
    const { totalSessionsPerWeek, avgDuration } = this.getMealPrepGenerationConfig();
    const selectedBaseEvents = proposal.baseEvents.filter((e) => !removedIds.has(e.id));

    try {
      const result = await firstValueFrom(
        this.schedulerApi.generate({
          existingEvents: selectedBaseEvents,
          workouts: this.workoutsSignal(),
          mealPrep: { duration: avgDuration, sessionsPerWeek: totalSessionsPerWeek },
          settings: this.settingsSignal(),
          weekContext: this.weekContextSignal(),
        }),
      );

      this.unplacedWorkoutsSignal.set(result.unplacedWorkouts);
      this.eventsSignal.set([...selectedBaseEvents, ...result.placedEvents]);
      this.clearOptimizationProposal();
    } catch (error) {
      console.error('Failed to apply optimization:', error);
    }
  }

  clearOptimizationProposal(): void {
    this.optimizationProposalSignal.set(null);
    this.eventsSignal.update((events) =>
      events.map((event) =>
        event.hasOptimizationConflict ? { ...event, hasOptimizationConflict: false } : event,
      ),
    );
  }

  private getMealPrepGenerationConfig(): { totalSessionsPerWeek: number; avgDuration: number } {
    const mealPrepSessions = this.mealPrepSessionsSignal();
    const configuredMealPrepSessions = this.settingsSignal().mealPrepSessionsPerWeek ?? 0;
    const sessionsFromMealPrepManager = mealPrepSessions.reduce(
      (sum, s) => sum + s.frequencyPerWeek,
      0,
    );

    return {
      totalSessionsPerWeek:
        configuredMealPrepSessions === 0
          ? 0
          : sessionsFromMealPrepManager > 0
            ? sessionsFromMealPrepManager
            : configuredMealPrepSessions,
      avgDuration:
        mealPrepSessions.length > 0
          ? Math.round(
              mealPrepSessions.reduce((sum, s) => sum + s.duration, 0) / mealPrepSessions.length,
            )
          : 90,
    };
  }

  private isBetterGenerationResult(
    candidate: GenerateScheduleResponse,
    current: GenerateScheduleResponse,
  ): boolean {
    if (candidate.placedWorkoutCount !== current.placedWorkoutCount) {
      return candidate.placedWorkoutCount > current.placedWorkoutCount;
    }

    if (candidate.weightedWorkoutScore !== current.weightedWorkoutScore) {
      return candidate.weightedWorkoutScore > current.weightedWorkoutScore;
    }

    if (candidate.placedEvents.length !== current.placedEvents.length) {
      return candidate.placedEvents.length > current.placedEvents.length;
    }

    if (candidate.unplacedWorkouts.length !== current.unplacedWorkouts.length) {
      return candidate.unplacedWorkouts.length < current.unplacedWorkouts.length;
    }

    return candidate.totalScore > current.totalScore;
  }

  private selectBestGenerationOption(
    options: Array<{ result: GenerateScheduleResponse; removedIds: Set<string> }>,
  ): { result: GenerateScheduleResponse; removedIds: Set<string> } | null {
    if (options.length === 0) {
      return null;
    }

    const maxLongPlaced = options.reduce(
      (max, option) => Math.max(max, option.result.placedLongWorkoutCount),
      0,
    );
    const minAcceptedLong = Math.max(0, maxLongPlaced - this.LONG_FEASIBLE_TOLERANCE);
    const feasibleOptions = options.filter(
      (option) => option.result.placedLongWorkoutCount >= minAcceptedLong,
    );

    return feasibleOptions.reduce(
      (best, option) => {
        if (!best) {
          return option;
        }
        return this.isBetterGenerationResult(option.result, best.result) ? option : best;
      },
      null as { result: GenerateScheduleResponse; removedIds: Set<string> } | null,
    );
  }

  private buildRemovableSubsets(events: CalendarEvent[], maxSize: number): CalendarEvent[][] {
    const result: CalendarEvent[][] = [];

    const backtrack = (start: number, current: CalendarEvent[]): void => {
      if (current.length > 0) {
        result.push([...current]);
      }
      if (current.length === maxSize) {
        return;
      }

      for (let i = start; i < events.length; i += 1) {
        current.push(events[i]);
        backtrack(i + 1, current);
        current.pop();
      }
    };

    backtrack(0, []);
    return result;
  }

  private markConflictEvents(conflictIds: Set<string>): void {
    this.eventsSignal.update((events) =>
      events.map((event) => ({
        ...event,
        hasOptimizationConflict: conflictIds.has(event.id),
      })),
    );
  }

  private buildConflictMoves(
    conflicts: CalendarEvent[],
    candidateResult: GenerateScheduleResponse,
  ): Record<string, { current: string; change: string }> {
    const moves: Record<string, { current: string; change: string }> = {};
    const usedSuggestionIds = new Set<string>();

    for (const conflict of conflicts) {
      const current = `${this.dayLabels[conflict.day]} · ${conflict.startTime} - ${conflict.endTime}`;

      const suggestions = candidateResult.placedEvents
        .filter((event) => event.type === conflict.type)
        .filter((event) => event.title === conflict.title)
        .filter((event) => {
          if (conflict.type !== 'workout') {
            return true;
          }
          return event.workoutType === conflict.workoutType;
        })
        .filter((event) => !usedSuggestionIds.has(event.id))
        .sort((a, b) => {
          if (a.day !== b.day) {
            return a.day - b.day;
          }
          return a.startTime.localeCompare(b.startTime);
        });

      const chosen = suggestions[0];
      if (chosen) {
        usedSuggestionIds.add(chosen.id);
      }

      moves[conflict.id] = {
        current,
        change: chosen
          ? `${this.dayLabels[chosen.day]} · ${chosen.startTime} - ${chosen.endTime}`
          : 'No direct move (combined reschedule unlocks better plan)',
      };
    }

    return moves;
  }
}
