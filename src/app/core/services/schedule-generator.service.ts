import { Injectable } from '@angular/core';
import { CalendarEvent } from '../models/calendar-event.model';
import { MealPrep } from '../models/mealprep.model';
import { DEFAULT_SETTINGS, PriorityItem, SchedulerSettings } from '../models/scheduler-settings.model';
import { DEFAULT_WEEK_CONTEXT, WeekContext } from '../models/week context.model';
import { Workout, getWorkoutFamily, isEnduranceType } from '../models/workout.model';
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

export interface UnplacedWorkout {
  workoutId: string;
  workoutName: string;
  workout: Workout;
  reason: string; // e.g., "Required rest day after intensive session", "Insufficient 3-hour recovery window"
  frequency: number; // which occurrence (1st, 2nd, etc.)
}

export interface GenerationResult {
  placedEvents: CalendarEvent[];
  unplacedWorkouts: UnplacedWorkout[];
  totalScore: number;
  placedWorkoutCount: number;
  placedLongWorkoutCount: number;
  weightedWorkoutScore: number;
}

interface Candidate {
  day: number;
  startMin: number;
  score: number;
}

type Session = WorkoutSession | MealPrepSession;

interface WorkoutSession {
  kind: 'workout';
  title: string;
  duration: number;
  workout: Workout;
  frequency: number;
}

interface MealPrepSession {
  kind: 'mealprep';
  title: string;
  duration: number;
}

interface SearchState {
  placedEvents: CalendarEvent[];
  occupied: TimeInterval[];
  totalScore: number;
  placedWorkoutCount: number;
  placedLongWorkoutCount: number;
  weightedWorkoutScore: number;
  unplacedWorkouts: UnplacedWorkout[];
}

@Injectable({
  providedIn: 'root',
})
export class ScheduleGeneratorService {
  private readonly MAX_CANDIDATES_PER_SESSION = 8;
  private readonly MAX_SEARCH_NODES = 30000;
  private readonly UNPLACED_WORKOUT_PENALTY = 2;
  private readonly LONG_FEASIBLE_TOLERANCE = 1;
  private readonly WIDEST_WINDOW_BONUS_CAP = 0.45;

  constructor(
    private readonly constraintChecker: ConstraintCheckerService,
    private readonly scoringEngine: ScoringEngineService,
  ) {}

  generate(input: GenerationInput): GenerationResult {
    const settings = input.settings ?? DEFAULT_SETTINGS;
    const weekContext = input.weekContext ?? DEFAULT_WEEK_CONTEXT;

    const shiftEvents = input.existingEvents.filter((e) => e.type === 'shift');
    const fixedOccupied: TimeInterval[] = [
      ...input.existingEvents.flatMap((e) => eventIntervals(e)),
      ...weekContext.personalEvents.flatMap((e) => eventIntervals(e)),
    ];

    const workoutSessions = input.workouts.flatMap((workout) => {
      const alreadyPlaced = input.existingEvents.filter(
        (e) => e.type === 'workout' && e.title === workout.name,
      ).length;
      const remainingFrequency = Math.max(0, workout.frequencyPerWeek - alreadyPlaced);

      return Array.from({ length: remainingFrequency }, (_, index) => ({
        kind: 'workout' as const,
        title: workout.name,
        duration: workout.duration,
        workout,
        frequency: alreadyPlaced + index + 1,
      }));
    });

    const mealPrepSessions = Array.from(
      { length: input.mealPrep.sessionsPerWeek },
      () => ({
        kind: 'mealprep' as const,
        title: 'Meal Prep',
        duration: input.mealPrep.duration,
      }),
    );

    const sessions = this.orderSessions([...workoutSessions, ...mealPrepSessions], settings);
    const existingWorkoutCount = input.existingEvents.filter((e) => e.type === 'workout').length;
    const existingLongWorkoutCount = input.existingEvents.filter(
      (e) => e.type === 'workout' && this.isCalendarEventLongEndurance(e, settings),
    ).length;
    const totalWorkoutsNeeded = existingWorkoutCount + workoutSessions.length;
    let visitedNodes = 0;
    const completedStates: SearchState[] = [];

    const initialState: SearchState = {
      placedEvents: [],
      occupied: fixedOccupied,
      totalScore: 0,
      placedWorkoutCount: 0,
      placedLongWorkoutCount: 0,
      weightedWorkoutScore: 0,
      unplacedWorkouts: [],
    };

    const dfs = (index: number, state: SearchState): void => {
      if (visitedNodes >= this.MAX_SEARCH_NODES) {
        return;
      }
      visitedNodes += 1;

      if (index >= sessions.length) {
        completedStates.push(state);
        return;
      }

      const session = sessions[index];
      const alreadyPlacedForConstraints = [...input.existingEvents, ...state.placedEvents];
      const candidates = this.getCandidatesForSession({
        session,
        shifts: shiftEvents,
        occupied: state.occupied,
        alreadyPlaced: alreadyPlacedForConstraints,
        settings,
        weekContext,
        minDaysBetweenMealPrepSessions: input.mealPrep.daysPreppedFor ?? 1,
        totalWorkoutsNeeded,
      });

      const orderedCandidates = this.orderCandidatesForSession(session, candidates, alreadyPlacedForConstraints, settings);

      for (const candidate of orderedCandidates.slice(0, this.MAX_CANDIDATES_PER_SESSION)) {
        const event = this.createEventFromSession(session, candidate);
        const eventWeight = session.kind === 'workout' ? this.getWorkoutValue(session.workout, settings) : 0;
        const placesLongWorkout =
          session.kind === 'workout' && this.isIntensiveWorkout(session.workout, settings) ? 1 : 0;

        dfs(index + 1, {
          placedEvents: [...state.placedEvents, event],
          occupied: [...state.occupied, ...eventIntervals(event)],
          totalScore: state.totalScore + candidate.score,
          placedWorkoutCount: state.placedWorkoutCount + (session.kind === 'workout' ? 1 : 0),
          placedLongWorkoutCount: state.placedLongWorkoutCount + placesLongWorkout,
          weightedWorkoutScore: state.weightedWorkoutScore + eventWeight,
          unplacedWorkouts: state.unplacedWorkouts,
        });
      }

      if (session.kind === 'workout') {
        const reason = this.determineUnplacedReason(session.workout, alreadyPlacedForConstraints, settings);
        dfs(index + 1, {
          placedEvents: state.placedEvents,
          occupied: state.occupied,
          totalScore: state.totalScore - this.UNPLACED_WORKOUT_PENALTY,
          placedWorkoutCount: state.placedWorkoutCount,
          placedLongWorkoutCount: state.placedLongWorkoutCount,
          weightedWorkoutScore: state.weightedWorkoutScore,
          unplacedWorkouts: [
            ...state.unplacedWorkouts,
            {
              workoutId: session.workout.id,
              workoutName: session.workout.name,
              workout: session.workout,
              reason,
              frequency: session.frequency,
            },
          ],
        });
      } else {
        dfs(index + 1, state);
      }
    };

    dfs(0, initialState);

    const resolved = this.selectBestStateWithGuardrail(completedStates, existingLongWorkoutCount) ?? initialState;
    return {
      placedEvents: resolved.placedEvents,
      unplacedWorkouts: resolved.unplacedWorkouts,
      totalScore: resolved.totalScore,
      placedWorkoutCount: resolved.placedWorkoutCount,
      placedLongWorkoutCount: resolved.placedLongWorkoutCount,
      weightedWorkoutScore: resolved.weightedWorkoutScore,
    };
  }

  private orderCandidatesForSession(
    session: Session,
    candidates: Candidate[],
    alreadyPlaced: CalendarEvent[],
    settings: SchedulerSettings,
  ): Candidate[] {
    if (session.kind !== 'workout' || this.isIntensiveWorkout(session.workout, settings)) {
      return candidates;
    }

    return [...candidates].sort((a, b) => {
      const aScarcity = this.longCapacityPreservationScore(a.day, alreadyPlaced);
      const bScarcity = this.longCapacityPreservationScore(b.day, alreadyPlaced);
      if (aScarcity !== bScarcity) {
        return bScarcity - aScarcity;
      }
      return b.score - a.score;
    });
  }

  private longCapacityPreservationScore(day: number, alreadyPlaced: CalendarEvent[]): number {
    const dayEvents = alreadyPlaced.filter((event) => event.day === day);
    const workoutsOnDay = dayEvents.filter((event) => event.type === 'workout').length;
    const blockingEventsOnDay = dayEvents.filter((event) => event.type === 'shift' || event.type === 'custom-event').length;

    // Prefer days with other blocking events, but avoid concentrating many workouts on one day.
    return blockingEventsOnDay * 2 - workoutsOnDay * 3;
  }

  private determineUnplacedReason(
    workout: Workout,
    alreadyPlaced: CalendarEvent[],
    settings: SchedulerSettings,
  ): string {
    // Check if it's an intensive workout that needs rest days
    if (this.isIntensiveWorkout(workout, settings)) {
      const workoutsNeedingRest = alreadyPlaced.filter((e) => e.type === 'workout');
      if (workoutsNeedingRest.length > 0) {
        return 'Required rest day after intensive session (run/swim/bike exceeds threshold)';
      }
    }

    return 'Insufficient space in schedule or overlapping constraints (try adjusting recovery windows or settings)';
  }

  private isIntensiveWorkout(workout: Workout, settings: SchedulerSettings): boolean {
    const type = workout.workoutType;
    if (type !== 'running' && type !== 'biking' && type !== 'swimming') {
      return false;
    }
    const threshold = settings.enduranceThresholds[type];
    if (!threshold) return false;
    const durationExceeds = workout.duration >= threshold.durationMin;
    const distanceExceeds =
      workout.distanceKm !== undefined &&
      workout.distanceKm >= threshold.distanceKm &&
      workout.distanceCountsAsLong !== false;
    return durationExceeds || distanceExceeds;
  }

  private getCandidatesForSession(params: {
    session: Session;
    shifts: CalendarEvent[];
    occupied: TimeInterval[];
    alreadyPlaced: CalendarEvent[];
    settings: SchedulerSettings;
    weekContext: WeekContext;
    minDaysBetweenMealPrepSessions: number;
    totalWorkoutsNeeded?: number;
  }): Candidate[] {
    const {
      session,
      shifts, occupied, alreadyPlaced,
      settings, weekContext, minDaysBetweenMealPrepSessions, totalWorkoutsNeeded,
    } = params;

    const type: 'workout' | 'mealprep' = session.kind;
    const workout = session.kind === 'workout' ? session.workout : null;
    const duration = session.duration;

    const constraintCtx = {
      shifts,
      weekContext,
      settings,
      alreadyPlaced,
      minDaysBetweenMealPrepSessions,
    };

    const scoringCtx = {
      shifts,
      weekContext,
      settings,
      alreadyPlaced,
      candidateWorkout: {
        workoutType: workout?.workoutType,
        isLongEndurance: workout ? this.isIntensiveWorkout(workout, settings) : false,
        type,
      },
      totalWorkoutsNeeded,
    };
    const candidates: Candidate[] = [];

    const earliestMin = this.safeTimeToMinutes(settings.autoPlaceEarliestTime, 6 * 60);
    const latestMin = this.safeTimeToMinutes(settings.autoPlaceLatestTime, 22 * 60);
    const normalizedLatestMin = latestMin > earliestMin ? latestMin : earliestMin + 60;

    for (let day = 0; day < 7; day++) {
      const dayOccupied = occupied.filter((s) => s.day === day);

      for (let startMin = earliestMin; startMin <= normalizedLatestMin; startMin += 30) {
        const endMin = startMin + duration;

        if (endMin > normalizedLatestMin) {
          break;
        }

        const slotFree = !dayOccupied.some((s) =>
          overlaps({ day, start: startMin, end: endMin }, s),
        );

        if (!slotFree) {
          continue;
        }

        // Check if within auto-placement time range
        if (startMin < earliestMin || endMin > normalizedLatestMin) {
          continue;
        }

        if (
          this.constraintChecker.isHardViolation(
            day, startMin, endMin, type, workout, constraintCtx,
          )
        ) {
          continue;
        }

        const baseScore = this.scoringEngine.score(day, startMin, endMin, type, scoringCtx);
        const widestWindowBonus = this.calculateWidestWindowBonus(
          day,
          startMin,
          endMin,
          dayOccupied,
          earliestMin,
          normalizedLatestMin,
        );
        const score = baseScore + widestWindowBonus;
        candidates.push({ day, startMin, score });
      }
    }

    candidates.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      return b.startMin - a.startMin;
    });
    return candidates;
  }

  private createEventFromSession(session: Session, candidate: Candidate): CalendarEvent {
    const startTime = this.minutesToString(candidate.startMin);
    const event: CalendarEvent = {
      id: crypto.randomUUID(),
      title: session.title,
      type: session.kind,
      day: candidate.day,
      startTime,
      endTime: addMinutes(startTime, session.duration),
      durationMinutes: session.duration,
    };

    if (session.kind === 'workout') {
      event.workoutType = session.workout.workoutType;
      event.distanceKm = session.workout.distanceKm;
      event.distanceCountsAsLong = session.workout.distanceCountsAsLong;
    }

    return event;
  }

  private orderSessions(sessions: Session[], settings: SchedulerSettings): Session[] {
    return [...sessions].sort((a, b) => {
      if (a.kind !== b.kind) {
        return a.kind === 'workout' ? -1 : 1;
      }

      if (a.kind === 'mealprep' && b.kind === 'mealprep') {
        return 0;
      }

      const weightA = this.getWorkoutWeight((a as WorkoutSession).workout, settings);
      const weightB = this.getWorkoutWeight((b as WorkoutSession).workout, settings);
      if (weightA !== weightB) {
        return weightB - weightA;
      }

      const durationA = (a as WorkoutSession).duration;
      const durationB = (b as WorkoutSession).duration;
      return durationB - durationA;
    });
  }

  private getWorkoutWeight(workout: Workout, settings: SchedulerSettings): number {
    return this.getWorkoutValue(workout, settings);
  }

  private getWorkoutValue(workout: Workout, settings: SchedulerSettings): number {
    if (this.isIntensiveWorkout(workout, settings)) {
      return 2;
    }

    return getWorkoutFamily(workout.workoutType) === 'endurance' ? 1.05 : 1.05;
  }

  private isCalendarEventLongEndurance(event: CalendarEvent, settings: SchedulerSettings): boolean {
    if (event.type !== 'workout' || !event.workoutType || !isEnduranceType(event.workoutType)) {
      return false;
    }

    const workoutType = event.workoutType;
    if (workoutType !== 'running' && workoutType !== 'biking' && workoutType !== 'swimming') {
      return false;
    }

    const threshold = settings.enduranceThresholds[workoutType];
    const durationExceeds = (event.durationMinutes ?? 0) >= threshold.durationMin;
    const distanceExceeds =
      event.distanceKm !== undefined &&
      event.distanceKm >= threshold.distanceKm &&
      event.distanceCountsAsLong !== false;

    return durationExceeds || distanceExceeds;
  }

  private selectBestStateWithGuardrail(
    states: SearchState[],
    existingLongWorkoutCount: number,
  ): SearchState | null {
    if (states.length === 0) {
      return null;
    }

    const absoluteMaxLong = states.reduce(
      (max, state) => Math.max(max, existingLongWorkoutCount + state.placedLongWorkoutCount),
      0,
    );
    const minAcceptedLong = Math.max(0, absoluteMaxLong - this.LONG_FEASIBLE_TOLERANCE);

    const feasibleStates = states.filter(
      (state) => existingLongWorkoutCount + state.placedLongWorkoutCount >= minAcceptedLong,
    );

    return feasibleStates.reduce((best, candidate) => {
      if (!best) {
        return candidate;
      }
      return this.isBetterState(candidate, best) ? candidate : best;
    }, null as SearchState | null);
  }

  private isBetterState(candidate: SearchState, currentBest: SearchState): boolean {
    if (candidate.placedWorkoutCount !== currentBest.placedWorkoutCount) {
      return candidate.placedWorkoutCount > currentBest.placedWorkoutCount;
    }

    if (candidate.weightedWorkoutScore !== currentBest.weightedWorkoutScore) {
      return candidate.weightedWorkoutScore > currentBest.weightedWorkoutScore;
    }

    if (candidate.placedEvents.length !== currentBest.placedEvents.length) {
      return candidate.placedEvents.length > currentBest.placedEvents.length;
    }

    if (candidate.unplacedWorkouts.length !== currentBest.unplacedWorkouts.length) {
      return candidate.unplacedWorkouts.length < currentBest.unplacedWorkouts.length;
    }

    return candidate.totalScore > currentBest.totalScore;
  }

  private minutesToString(minutes: number): string {
    const hours = Math.floor(minutes / 60).toString().padStart(2, '0');
    const remaining = (minutes % 60).toString().padStart(2, '0');
    return `${hours}:${remaining}`;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private safeTimeToMinutes(time: string, fallback: number): number {
    if (!time || !time.includes(':')) {
      return fallback;
    }

    const [hoursText, minutesText] = time.split(':');
    const hours = Number(hoursText);
    const minutes = Number(minutesText);

    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      return fallback;
    }

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return fallback;
    }

    return hours * 60 + minutes;
  }

  private calculateWidestWindowBonus(
    day: number,
    startMin: number,
    endMin: number,
    dayOccupied: TimeInterval[],
    earliestMin: number,
    latestMin: number,
  ): number {
    const occupiedForDay = dayOccupied
      .filter((interval) => interval.day === day)
      .sort((a, b) => a.start - b.start);

    let windowStart = earliestMin;
    let windowEnd = latestMin;

    for (const interval of occupiedForDay) {
      if (interval.end <= startMin) {
        windowStart = Math.max(windowStart, interval.end);
        continue;
      }

      if (interval.start >= endMin) {
        windowEnd = Math.min(windowEnd, interval.start);
        break;
      }
    }

    const contiguousWindowMinutes = Math.max(0, windowEnd - windowStart);
    const normalized = Math.min(1, contiguousWindowMinutes / 240);
    return Number((normalized * this.WIDEST_WINDOW_BONUS_CAP).toFixed(3));
  }
}