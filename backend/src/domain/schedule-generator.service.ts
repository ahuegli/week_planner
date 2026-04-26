import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  CalendarEvent,
  MealPrep,
  DEFAULT_SETTINGS,
  SchedulerSettings,
  DEFAULT_WEEK_CONTEXT,
  WeekContext,
  Workout,
  isEnduranceType,
  getWorkoutFamily,
} from '../shared/models';
import {
  TimeInterval,
  eventIntervals,
  overlaps,
  addMinutes,
  minutesToString,
  safeTimeToMinutes,
} from '../shared/utils/time-utils';
import { ConstraintCheckerService } from './constraint-checker.service';
import { ScoringEngineService } from './scoring-engine.service';

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
  reason: string;
  frequency: number;
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

@Injectable()
export class ScheduleGeneratorService {
  private readonly MAX_CANDIDATES_PER_SESSION = 8;
  private readonly MAX_SEARCH_NODES = 30000;
  private readonly UNPLACED_WORKOUT_PENALTY = 2;
  private readonly LONG_FEASIBLE_TOLERANCE = 1;
  private readonly WIDEST_WINDOW_BONUS_CAP = 0.45;
  private readonly WORKOUT_PRIORITY_ORDER: Record<string, number> = {
    key: 0,
    supporting: 1,
    optional: 2,
  };

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

    const workouts = [...input.workouts].sort((a, b) => {
      const aPriority = this.WORKOUT_PRIORITY_ORDER[a.priority ?? 'supporting'] ?? 1;
      const bPriority = this.WORKOUT_PRIORITY_ORDER[b.priority ?? 'supporting'] ?? 1;
      return aPriority - bPriority;
    });

    const workoutSessions = workouts.flatMap((workout) => {
      const alreadyPlaced = input.existingEvents.filter((event) => {
        if (event.type !== 'workout') {
          return false;
        }

        if (event.plannedSessionId) {
          return event.plannedSessionId === workout.id;
        }

        return event.title === workout.name;
      }).length;
      const remainingFrequency = Math.max(0, workout.frequencyPerWeek - alreadyPlaced);

      return Array.from({ length: remainingFrequency }, (_, index) => ({
        kind: 'workout' as const,
        title: workout.name,
        duration: workout.duration,
        workout,
        frequency: alreadyPlaced + index + 1,
      }));
    });

    const mealPrepSessions = Array.from({ length: input.mealPrep.sessionsPerWeek }, () => ({
      kind: 'mealprep' as const,
      title: 'Meal Prep',
      duration: input.mealPrep.duration,
    }));

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

        for (const candidate of candidates.slice(0, this.MAX_CANDIDATES_PER_SESSION)) {
        const event = this.createEventFromSession(session, candidate);
        const eventWeight =
          session.kind === 'workout' ? this.getWorkoutValue(session.workout, settings) : 0;
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
        const reason = this.determineUnplacedReason(
          session.workout,
          alreadyPlacedForConstraints,
          settings,
        );
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

    const resolved =
      this.selectBestStateWithGuardrail(completedStates, existingLongWorkoutCount) ?? initialState;
    return {
      placedEvents: resolved.placedEvents,
      unplacedWorkouts: resolved.unplacedWorkouts,
      totalScore: resolved.totalScore,
      placedWorkoutCount: resolved.placedWorkoutCount,
      placedLongWorkoutCount: resolved.placedLongWorkoutCount,
      weightedWorkoutScore: resolved.weightedWorkoutScore,
    };
  }

  private determineUnplacedReason(
    workout: Workout,
    alreadyPlaced: CalendarEvent[],
    settings: SchedulerSettings,
  ): string {
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
      shifts,
      occupied,
      alreadyPlaced,
      settings,
      weekContext,
      minDaysBetweenMealPrepSessions,
      totalWorkoutsNeeded,
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
        durationMinutes: duration,
        sessionType: session.kind === 'workout' ? session.title : undefined,
        type,
        intensity: workout?.intensity,
        cyclePhaseRules: workout?.cyclePhaseRules,
      },
      totalWorkoutsNeeded,
    };
    const candidates: Candidate[] = [];

    const earliestMin = safeTimeToMinutes(settings.autoPlaceEarliestTime, 6 * 60);
    const latestMin = safeTimeToMinutes(settings.autoPlaceLatestTime, 22 * 60);
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

        if (startMin < earliestMin || endMin > normalizedLatestMin) {
          continue;
        }

        if (
          this.constraintChecker.isHardViolation(
            day,
            startMin,
            endMin,
            type,
            workout,
            constraintCtx,
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
      return a.startMin - b.startMin;
    });
    return candidates;
  }

  private createEventFromSession(session: Session, candidate: Candidate): CalendarEvent {
    const startTime = minutesToString(candidate.startMin);
    const event: CalendarEvent = {
      id: uuidv4(),
      title: session.title,
      type: session.kind,
      day: candidate.day,
      startTime,
      endTime: addMinutes(startTime, session.duration),
      durationMinutes: session.duration,
    };

    if (session.kind === 'workout') {
      event.plannedSessionId = session.workout.id;
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

      const priorityA = this.WORKOUT_PRIORITY_ORDER[(a as WorkoutSession).workout.priority ?? 'supporting'] ?? 1;
      const priorityB = this.WORKOUT_PRIORITY_ORDER[(b as WorkoutSession).workout.priority ?? 'supporting'] ?? 1;
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
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
      return (settings.enduranceWeight / 100) * 2;
    }

    if (getWorkoutFamily(workout.workoutType) === 'endurance') {
      return settings.enduranceWeight / 100;
    }

    if (workout.workoutType === 'strength') {
      return settings.strengthWeight / 100;
    }

    if (workout.workoutType === 'yoga') {
      return settings.yogaWeight / 100;
    }

    return 0.3;
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

    return feasibleStates.reduce(
      (best, candidate) => {
        if (!best) {
          return candidate;
        }
        return this.isBetterState(candidate, best) ? candidate : best;
      },
      null as SearchState | null,
    );
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
