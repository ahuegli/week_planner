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
import { GenerationResult, ScheduleGeneratorService, UnplacedWorkout } from './schedule-generator.service';

export interface OptimizationProposal {
  conflictEvents: CalendarEvent[];
  baseEvents: CalendarEvent[];
  baselineUnplacedCount: number;
  improvedUnplacedCount: number;
  conflictGains: Record<string, { placedWorkoutDelta: number; weightedDelta: number; scoreDelta: number }>;
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
    distanceCountsAsLong?: boolean,
  ): void {
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

  removeWorkout(id: string): void {
    this.workoutsSignal.update((workouts) => workouts.filter((w) => w.id !== id));
  }

  addMealPrepSession(name: string, duration: number, frequencyPerWeek: number, daysPreppedFor: number): void {
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

  addManualEvent(
    day: number,
    type: 'workout' | 'mealprep',
    title: string,
    duration: number,
    workoutType?: WorkoutType,
    distanceKm?: number,
    distanceCountsAsLong?: boolean,
  ): void {
    const startTime = '18:00';
    const event: CalendarEvent = {
      id: crypto.randomUUID(),
      title,
      type,
      day,
      startTime,
      endTime: addMinutes(startTime, duration),
      durationMinutes: duration,
      workoutType,
      distanceKm,
      distanceCountsAsLong,
      isLocked: true, // Mark as fixed so smart plan does not reallocate
      isManuallyPlaced: true, // Mark as manually placed by user
    };
    this.eventsSignal.update((current) => [...current, event]);
  }

  moveEvent(eventId: string, targetDay: number): void {
    this.eventsSignal.update((events) =>
      events.map((event) =>
        event.id === eventId ? { ...event, day: targetDay, isLocked: true, isManuallyPlaced: true } : event,
      ),
    );
  }

  updateEvent(updatedEvent: CalendarEvent): void {
    this.eventsSignal.update((events) =>
      events.map((event) =>
        event.id === updatedEvent.id ? updatedEvent : event,
      ),
    );
  }

  removeEvent(eventId: string): void {
    this.eventsSignal.update((events) => events.filter((event) => event.id !== eventId));
  }

  clearGeneratedEvents(): void {
    this.clearOptimizationProposal();
    this.eventsSignal.update((events) => 
      events.filter((event) => event.type === 'shift' || event.type === 'custom-event')
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

  addPersonalEvent(event: CalendarEvent): void {
    const personal: CalendarEvent = { ...event, isPersonal: true };
    this.eventsSignal.update((current) => [...current, personal]);
    this.weekContextSignal.update((current) => ({
      ...current,
      personalEvents: [...current.personalEvents, personal],
    }));
  }

  generateSuggestedPlan(): void {
    this.clearOptimizationProposal();

    // Aggregate meal prep sessions into a single config for schedule generator
    const mealPrepSessions = this.mealPrepSessionsSignal();
    const totalSessionsPerWeek = mealPrepSessions.reduce((sum, s) => sum + s.frequencyPerWeek, 0);
    const avgDuration = mealPrepSessions.length > 0 
      ? Math.round(mealPrepSessions.reduce((sum, s) => sum + s.duration, 0) / mealPrepSessions.length)
      : 90;

    const result = this.scheduleGenerator.generate({
      existingEvents: this.eventsSignal(),
      workouts: this.workoutsSignal(),
      mealPrep: { duration: avgDuration, sessionsPerWeek: totalSessionsPerWeek },
      settings: this.settingsSignal(),
      weekContext: this.weekContextSignal(),
    });

    // Store unplaced workouts for display
    this.unplacedWorkoutsSignal.set(result.unplacedWorkouts);

    this.eventsSignal.update((events) => {
      const preserved = events.filter((e) => e.type === 'shift' || e.type === 'custom-event' || e.isLocked || e.isPersonal);
      return [...preserved, ...result.placedEvents];
    });
  }

  addCustomEvent(customEvent: CustomEvent, days?: number[]): void {
    this.customEventsSignal.update((current) => [...current, customEvent]);

    // Add calendar events for this custom event
    const daysToAdd = days ?? [0, 1, 2, 3, 4, 5, 6]; // All days if not specified
    
    for (const day of daysToAdd) {
      const calendarEvent: CalendarEvent = {
        id: crypto.randomUUID(),
        title: customEvent.title,
        type: 'custom-event',
        day,
        startTime: customEvent.startTime,
        endTime: customEvent.endTime,
        notes: customEvent.notes,
        commuteMinutes: customEvent.commuteMinutes,
        isRepeatingWeekly: customEvent.isRepeatingWeekly,
        isLocked: true, // Custom events should not be moved by scheduler
      };
      this.eventsSignal.update((current) => [...current, calendarEvent]);
    }
  }

  deleteCustomEvent(id: string): void {
    const customEvent = this.customEventsSignal().find(ce => ce.id === id);
    if (!customEvent) return;

    this.customEventsSignal.update((events) => events.filter((e) => e.id !== id));
    // Remove all calendar events associated with this custom event
    this.eventsSignal.update((events) => 
      events.filter((e) => !(e.type === 'custom-event' && e.title === customEvent.title))
    );
  }

  addCustomShiftDefinition(customShift: CustomShift): void {
    this.customShiftsSignal.update((current) => [...current, customShift]);
  }

  updateCustomShift(id: string, updated: CustomShift): void {
    const oldShift = this.customShiftsSignal().find(s => s.id === id);
    if (!oldShift) return;

    this.customShiftsSignal.update((shifts) =>
      shifts.map((s) => (s.id === id ? updated : s))
    );

    // Update all calendar events with this shift
    this.eventsSignal.update((events) =>
      events.map((e) =>
        e.type === 'shift' && e.title === oldShift.label
          ? { ...e, title: updated.label, startTime: updated.startTime, endTime: updated.endTime, commuteMinutes: updated.commuteMinutes }
          : e
      )
    );
  }

  deleteCustomShift(id: string): void {
    const customShift = this.customShiftsSignal().find(cs => cs.id === id);
    if (!customShift) return;

    this.customShiftsSignal.update((shifts) => shifts.filter((s) => s.id !== id));
    // Remove all calendar events associated with this custom shift
    this.eventsSignal.update((events) =>
      events.filter((e) => !(e.type === 'shift' && e.title === customShift.label))
    );
  }

  createShiftEvent(shiftLabel: string, startTime: string, endTime: string, day: number, commuteMinutes: number = 0): void {
    const calendarEvent: CalendarEvent = {
      id: crypto.randomUUID(),
      title: shiftLabel,
      type: 'shift',
      day,
      startTime,
      endTime,
      isLocked: true,
      commuteMinutes,
    };
    this.eventsSignal.update((current) => [...current, calendarEvent]);
  }

  updateEventCommute(eventId: string, commuteMinutes: number): void {
    this.eventsSignal.update((events) =>
      events.map((e) =>
        e.id === eventId
          ? { ...e, commuteMinutes }
          : e
      )
    );
  }

  updateEventCommuteByShift(shiftLabel: string, shiftStartTime: string, commuteMinutes: number): void {
    this.eventsSignal.update((events) =>
      events.map((e) =>
        e.type === 'shift' && e.title === shiftLabel && e.startTime === shiftStartTime
          ? { ...e, commuteMinutes }
          : e
      )
    );
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

  optimizeSchedule(): void {
    this.clearOptimizationProposal();

    const unplaced = this.unplacedWorkoutsSignal();
    if (unplaced.length === 0) {
      return; // Nothing to optimize
    }

    const currentEvents = this.eventsSignal();
    
    // Only get manually-placed events - these should block rest days and be preserved
    const eventsForGeneration = currentEvents.filter((e) => 
      e.type === 'shift' || 
      e.type === 'custom-event' || 
      e.isPersonal ||
      (e.type === 'workout' && e.isManuallyPlaced) ||
      (e.type === 'mealprep' && e.isManuallyPlaced)
    );

    const manuallyPlacedWorkouts = eventsForGeneration.filter(
      (e) => e.type === 'workout' && e.isManuallyPlaced
    );

    const { totalSessionsPerWeek, avgDuration } = this.getMealPrepGenerationConfig();

    // Re-run generation with only preserved events (no auto-generated ones from previous run)
    const baseline = this.scheduleGenerator.generate({
      existingEvents: eventsForGeneration,
      workouts: this.workoutsSignal(),
      mealPrep: { duration: avgDuration, sessionsPerWeek: totalSessionsPerWeek },
      settings: this.settingsSignal(),
      weekContext: this.weekContextSignal(),
    });

    if (baseline.unplacedWorkouts.length === 0) {
      this.unplacedWorkoutsSignal.set([]);
      this.eventsSignal.set([...eventsForGeneration, ...baseline.placedEvents]);
      return;
    }

    const manualCandidates = manuallyPlacedWorkouts.slice(0, 8);
    const subsets = this.buildRemovableSubsets(manualCandidates, 3);

    const generationOptions: Array<{ result: GenerationResult; removedIds: Set<string> }> = [
      { result: baseline, removedIds: new Set<string>() },
    ];

    for (const subset of subsets) {
      const removedIds = new Set(subset.map((e) => e.id));
      const eventsWithoutSubset = eventsForGeneration.filter((e) => !removedIds.has(e.id));
      const candidate = this.scheduleGenerator.generate({
        existingEvents: eventsWithoutSubset,
        workouts: this.workoutsSignal(),
        mealPrep: { duration: avgDuration, sessionsPerWeek: totalSessionsPerWeek },
        settings: this.settingsSignal(),
        weekContext: this.weekContextSignal(),
      });

      generationOptions.push({ result: candidate, removedIds });
    }

    const bestOption = this.selectBestGenerationOption(generationOptions);
    const bestResult = bestOption?.result ?? baseline;
    const bestRemovedIds = bestOption?.removedIds ?? new Set<string>();

    if (bestRemovedIds.size > 0) {
      const conflicts = manualCandidates.filter((e) => bestRemovedIds.has(e.id));
      const conflictGains: Record<string, { placedWorkoutDelta: number; weightedDelta: number; scoreDelta: number }> = {};
      const conflictMoves = this.buildConflictMoves(conflicts, bestResult);

      for (const conflict of conflicts) {
        const eventsWithoutConflict = eventsForGeneration.filter((event) => event.id !== conflict.id);
        const soloResult = this.scheduleGenerator.generate({
          existingEvents: eventsWithoutConflict,
          workouts: this.workoutsSignal(),
          mealPrep: { duration: avgDuration, sessionsPerWeek: totalSessionsPerWeek },
          settings: this.settingsSignal(),
          weekContext: this.weekContextSignal(),
        });

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
  }

  applyOptimizationSelection(selectedRescheduleIds: string[]): void {
    const proposal = this.optimizationProposalSignal();
    if (!proposal) {
      return;
    }

    const removedIds = new Set(selectedRescheduleIds);
    const { totalSessionsPerWeek, avgDuration } = this.getMealPrepGenerationConfig();
    const selectedBaseEvents = proposal.baseEvents.filter((e) => !removedIds.has(e.id));

    const result = this.scheduleGenerator.generate({
      existingEvents: selectedBaseEvents,
      workouts: this.workoutsSignal(),
      mealPrep: { duration: avgDuration, sessionsPerWeek: totalSessionsPerWeek },
      settings: this.settingsSignal(),
      weekContext: this.weekContextSignal(),
    });

    this.unplacedWorkoutsSignal.set(result.unplacedWorkouts);
    this.eventsSignal.set([...selectedBaseEvents, ...result.placedEvents]);
    this.clearOptimizationProposal();
  }

  clearOptimizationProposal(): void {
    this.optimizationProposalSignal.set(null);
    this.eventsSignal.update((events) =>
      events.map((event) =>
        event.hasOptimizationConflict
          ? { ...event, hasOptimizationConflict: false }
          : event,
      ),
    );
  }

  private getMealPrepGenerationConfig(): { totalSessionsPerWeek: number; avgDuration: number } {
    const mealPrepSessions = this.mealPrepSessionsSignal();
    return {
      totalSessionsPerWeek: mealPrepSessions.reduce((sum, s) => sum + s.frequencyPerWeek, 0),
      avgDuration:
        mealPrepSessions.length > 0
          ? Math.round(mealPrepSessions.reduce((sum, s) => sum + s.duration, 0) / mealPrepSessions.length)
          : 90,
    };
  }

  private isBetterGenerationResult(candidate: GenerationResult, current: GenerationResult): boolean {
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
    options: Array<{ result: GenerationResult; removedIds: Set<string> }>,
  ): { result: GenerationResult; removedIds: Set<string> } | null {
    if (options.length === 0) {
      return null;
    }

    const maxLongPlaced = options.reduce(
      (max, option) => Math.max(max, option.result.placedLongWorkoutCount),
      0,
    );
    const minAcceptedLong = Math.max(0, maxLongPlaced - this.LONG_FEASIBLE_TOLERANCE);
    const feasibleOptions = options.filter((option) => option.result.placedLongWorkoutCount >= minAcceptedLong);

    return feasibleOptions.reduce((best, option) => {
      if (!best) {
        return option;
      }
      return this.isBetterGenerationResult(option.result, best.result) ? option : best;
    }, null as { result: GenerationResult; removedIds: Set<string> } | null);
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
    candidateResult: GenerationResult,
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