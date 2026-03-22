import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { ConstraintCheckerService } from './constraint-checker.service';
import {
  ScoringEngineService,
  addMinutes,
  eventIntervals,
  timeToMinutes,
} from './scoring-engine.service';

interface Session {
  kind: 'workout' | 'mealprep';
  title: string;
  duration: number;
  workout?: any;
  frequency?: number;
}

interface Candidate {
  day: number;
  startTime: string;
  endTime: string;
  score: number;
}

interface State {
  placedEvents: any[];
  occupied: { day: number; start: string; end: string }[];
  totalScore: number;
  placedWorkoutCount: number;
  placedLongWorkoutCount: number;
  weightedWorkoutScore: number;
  unplacedWorkouts: string[];
}

@Injectable()
export class ScheduleGeneratorService {
  private readonly MAX_CANDIDATES_PER_SESSION = 8;
  private readonly MAX_SEARCH_NODES = 30000;

  constructor(
    private readonly constraintChecker: ConstraintCheckerService,
    private readonly scoringEngine: ScoringEngineService,
  ) {}

  generate(input: any): any {
    const settings = input.settings;
    const weekContext = input.weekContext;

    const shiftEvents = input.existingEvents.filter((e: any) => e.type === 'shift');
    const fixedOccupied = [
      ...input.existingEvents.flatMap((e: any) => eventIntervals(e)),
      ...(weekContext.personalEvents || []).flatMap((e: any) => eventIntervals(e)),
    ];

    const workoutSessions: Session[] = input.workouts.flatMap((workout: any) => {
      const alreadyPlaced = input.existingEvents.filter(
        (e: any) => e.type === 'workout' && e.title === workout.name,
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

    const mealPrepSessions: Session[] = Array.from(
      { length: input.mealPrep.sessionsPerWeek },
      () => ({
        kind: 'mealprep' as const,
        title: 'Meal Prep',
        duration: input.mealPrep.duration,
      }),
    );

    const sessions = [...workoutSessions, ...mealPrepSessions];

    let visitedNodes = 0;
    const completedStates: State[] = [];

    const initialState: State = {
      placedEvents: [],
      occupied: fixedOccupied,
      totalScore: 0,
      placedWorkoutCount: 0,
      placedLongWorkoutCount: 0,
      weightedWorkoutScore: 0,
      unplacedWorkouts: [],
    };

    const dfs = (index: number, state: State) => {
      if (visitedNodes >= this.MAX_SEARCH_NODES) {
        return;
      }
      visitedNodes += 1;

      if (index >= sessions.length) {
        completedStates.push(state);
        return;
      }

      const session = sessions[index];
      const candidates = this.getCandidatesForSession(
        session,
        shiftEvents,
        state.occupied,
        settings,
      );

      if (candidates.length === 0) {
        // Can't place this session, skip and track as unplaced
        const unplacedWorkouts =
          session.kind === 'workout'
            ? [...state.unplacedWorkouts, session.title]
            : state.unplacedWorkouts;
        dfs(index + 1, { ...state, unplacedWorkouts });
        return;
      }

      for (const candidate of candidates.slice(0, this.MAX_CANDIDATES_PER_SESSION)) {
        const event = this.createEventFromSession(session, candidate);
        const eventWeight =
          session.kind === 'workout'
            ? this.scoringEngine.getWorkoutValue(session.workout, settings)
            : 0;

        dfs(index + 1, {
          placedEvents: [...state.placedEvents, event],
          occupied: [...state.occupied, ...eventIntervals(event)],
          totalScore: state.totalScore + candidate.score,
          placedWorkoutCount: state.placedWorkoutCount + (session.kind === 'workout' ? 1 : 0),
          placedLongWorkoutCount:
            state.placedLongWorkoutCount +
            (session.kind === 'workout' && session.duration >= settings.enduranceWorkoutMinDuration
              ? 1
              : 0),
          weightedWorkoutScore: state.weightedWorkoutScore + eventWeight,
          unplacedWorkouts: state.unplacedWorkouts,
        });
      }
    };

    dfs(0, initialState);

    // Find best state
    if (completedStates.length === 0) {
      return {
        placedEvents: [],
        unplacedWorkouts: sessions.filter((s) => s.kind === 'workout').map((s) => s.title),
        totalScore: 0,
        placedWorkoutCount: 0,
        placedLongWorkoutCount: 0,
        weightedWorkoutScore: 0,
      };
    }

    const bestState = completedStates.reduce((best, current) =>
      current.weightedWorkoutScore > best.weightedWorkoutScore ? current : best,
    );

    return bestState;
  }

  private getCandidatesForSession(
    session: Session,
    shifts: any[],
    occupied: { day: number; start: string; end: string }[],
    settings: any,
  ): Candidate[] {
    const candidates: Candidate[] = [];

    for (let day = 0; day < 7; day++) {
      const dayShifts = shifts.filter((s) => s.day === day);

      // Generate time slots (every 30 minutes from 6:00 to 22:00)
      for (let hour = 6; hour < 22; hour++) {
        for (const minute of [0, 30]) {
          const startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
          const endTime = addMinutes(startTime, session.duration);

          // Check if slot ends before midnight
          if (timeToMinutes(endTime) > 24 * 60) continue;

          // Check availability
          if (!this.constraintChecker.isSlotAvailable(day, startTime, endTime, occupied)) {
            continue;
          }

          // Check shift buffer constraints
          let violatesBuffer = false;
          for (const shift of dayShifts) {
            const tempEvent = { day, startTime, endTime };
            if (this.constraintChecker.violatesShiftBuffer(tempEvent, shift, settings)) {
              violatesBuffer = true;
              break;
            }
          }
          if (violatesBuffer) continue;

          const score = this.scoringEngine.scoreSlot(
            { day, startTime, endTime, ...session },
            shifts,
            settings,
            {},
          );

          candidates.push({ day, startTime, endTime, score });
        }
      }
    }

    // Sort by score descending
    return candidates.sort((a, b) => b.score - a.score);
  }

  private createEventFromSession(session: Session, candidate: Candidate): any {
    return {
      id: uuidv4(),
      title: session.title,
      type: session.kind,
      day: candidate.day,
      startTime: candidate.startTime,
      endTime: candidate.endTime,
      durationMinutes: session.duration,
    };
  }
}
