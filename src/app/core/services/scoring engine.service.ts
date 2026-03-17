import { Injectable } from '@angular/core';
import { CalendarEvent, CalendarEventType } from '../models/calendar-event.model';
import { SchedulerSettings } from '../models/scheduler-settings.model';
import { WeekContext } from '../models/week context.model';
import { getWorkoutFamily, isEnduranceType, WorkoutType } from '../models/workout.model';

export interface ScoringContext {
  shifts: CalendarEvent[];
  weekContext: WeekContext;
  settings: SchedulerSettings;
  alreadyPlaced: CalendarEvent[];
  candidateWorkout?: {
    workoutType?: WorkoutType;
    isLongEndurance?: boolean;
    type: 'workout' | 'mealprep';
  };
  totalWorkoutsNeeded?: number; // For completion bonus
}

@Injectable({
  providedIn: 'root',
})
export class ScoringEngineService {
  private readonly SAME_TYPE_STACKING_PENALTY = 1.5;
  private readonly SAME_FAMILY_STACKING_PENALTY = 0.4;
  private readonly CROSS_FAMILY_STACKING_PENALTY = 0.1;
  private readonly DAY_CONCENTRATION_PENALTY = 0.5;
  private readonly EVENT_DAY_WORKOUT_PENALTY = 0.05;
  private readonly DIVERSITY_COMBO_BONUS = 0.6;

  score(
    day: number,
    startMin: number,
    endMin: number,
    type: CalendarEventType,
    ctx: ScoringContext,
  ): number {
    let total = 0;

    total += this.offDayBonus(day, type, ctx.shifts);
    total -= this.fatiguePenalty(day, ctx.weekContext.exhaustionByDay);
    total += this.mealPrepSpacingBonus(day, type, ctx.alreadyPlaced);
    total += this.timeOfDayBonus(startMin, type);
    total += this.shiftAwareTimePreference(day, startMin, endMin, type, ctx);
    total -= this.eventDayPenalty(day, type, ctx.alreadyPlaced);
    total += this.diversityComboBonus(day, type, ctx.alreadyPlaced, ctx.candidateWorkout);
    total -= this.stackingPenalty(day, type, ctx.alreadyPlaced, ctx.candidateWorkout);
    total -= this.dayConcentrationPenalty(day, type, ctx.alreadyPlaced);
    total += this.completionBonus(type, ctx.alreadyPlaced, ctx.totalWorkoutsNeeded);

    return total;
  }

  private offDayBonus(day: number, type: CalendarEventType, shifts: CalendarEvent[]): number {
    if (type !== 'workout') {
      return 0;
    }
    return 0;
  }

  private fatiguePenalty(day: number, exhaustionByDay: number[]): number {
    const exhaustion = exhaustionByDay[day] ?? 0;
    return Number(((exhaustion / 10) * 0.5).toFixed(3));
  }

  private commutePenalty(
    day: number,
    commuteByDay: boolean[],
    settings: SchedulerSettings,
  ): number {
    void day;
    void commuteByDay;
    void settings;
    // Commute constraints are enforced as hard constraints in the placement engine.
    // Avoid additional day-level penalties that can unintentionally bias against after-work slots.
    return 0;
  }

  private mealPrepSpacingBonus(
    day: number,
    type: CalendarEventType,
    alreadyPlaced: CalendarEvent[],
  ): number {
    if (type !== 'mealprep') {
      return 0;
    }

    const existingSessions = alreadyPlaced
      .filter((e) => e.type === 'mealprep')
      .map((e) => e.day);

    if (existingSessions.length === 0) {
      return 0;
    }

    const minDistance = Math.min(...existingSessions.map((d) => Math.abs(d - day)));
    if (minDistance >= 3) return 0.6;
    if (minDistance === 2) return 0.2;
    return 0;
  }

  private timeOfDayBonus(startMin: number, type: CalendarEventType): number {
    if (type === 'workout') {
      if (startMin >= 7 * 60 && startMin <= 9 * 60) return 0.2;
      if (startMin >= 17 * 60 && startMin <= 19 * 60) return 0.2;
      return 0;
    }

    if (type === 'mealprep') {
      if (startMin >= 10 * 60 && startMin <= 12 * 60) return 0.2;
      if (startMin >= 15 * 60 && startMin <= 17 * 60) return 0.15;
      return 0;
    }

    return 0;
  }

  private eventDayPenalty(day: number, type: CalendarEventType, alreadyPlaced: CalendarEvent[]): number {
    if (type !== 'workout') {
      return 0;
    }

    const busyEvents = alreadyPlaced.filter(
      (event) =>
        event.day === day &&
        (event.type === 'custom-event' || event.type === 'mealprep' || event.isPersonal),
    ).length;

    return busyEvents * this.EVENT_DAY_WORKOUT_PENALTY;
  }

  private diversityComboBonus(
    day: number,
    type: CalendarEventType,
    alreadyPlaced: CalendarEvent[],
    candidateWorkout?: { workoutType?: WorkoutType; isLongEndurance?: boolean; type: 'workout' | 'mealprep' },
  ): number {
    if (type !== 'workout' || !candidateWorkout?.workoutType || candidateWorkout.isLongEndurance) {
      return 0;
    }

    const candidateFamily = getWorkoutFamily(candidateWorkout.workoutType);
    const sameDayWorkouts = alreadyPlaced.filter((event) => event.type === 'workout' && event.day === day);
    const hasCrossFamilyPair = sameDayWorkouts.some((event) => {
      if (!event.workoutType || !isEnduranceType(event.workoutType)) {
        return candidateFamily === 'endurance';
      }
      return candidateFamily === 'strength';
    });

    return hasCrossFamilyPair ? this.DIVERSITY_COMBO_BONUS : 0;
  }

  private stackingPenalty(
    day: number,
    type: CalendarEventType,
    alreadyPlaced: CalendarEvent[],
    candidateWorkout?: { workoutType?: WorkoutType; isLongEndurance?: boolean; type: 'workout' | 'mealprep' },
  ): number {
    if (type !== 'workout') return 0;
    if (!candidateWorkout?.workoutType || candidateWorkout.isLongEndurance) return 0;

    const workoutsOnDay = alreadyPlaced.filter(
      (e) => e.type === 'workout' && e.day === day,
    );

    if (workoutsOnDay.length === 0) return 0;

    let penalty = 0;
    const candidateFamily = getWorkoutFamily(candidateWorkout.workoutType);

    for (const event of workoutsOnDay) {
      if (!event.workoutType) {
        continue;
      }

      if (event.workoutType === candidateWorkout.workoutType) {
        penalty += this.SAME_TYPE_STACKING_PENALTY;
        continue;
      }

      if (getWorkoutFamily(event.workoutType) === candidateFamily) {
        penalty += this.SAME_FAMILY_STACKING_PENALTY;
      } else {
        penalty += this.CROSS_FAMILY_STACKING_PENALTY;
      }
    }

    return penalty;
  }

  private dayConcentrationPenalty(
    day: number,
    type: CalendarEventType,
    alreadyPlaced: CalendarEvent[],
  ): number {
    if (type !== 'workout') {
      return 0;
    }

    const workoutsOnDay = alreadyPlaced.filter((event) => event.type === 'workout' && event.day === day).length;
    return workoutsOnDay * this.DAY_CONCENTRATION_PENALTY;
  }

  private completionBonus(
    type: CalendarEventType,
    alreadyPlaced: CalendarEvent[],
    totalWorkoutsNeeded?: number,
  ): number {
    // Only apply bonus when placing the final workout (if we can predict it)
    if (!totalWorkoutsNeeded || type !== 'workout') {
      return 0;
    }

    const workoutsPlaced = alreadyPlaced.filter((e) => e.type === 'workout').length;
    
    const remainingToPlace = totalWorkoutsNeeded - workoutsPlaced;
    
    if (remainingToPlace <= 1) {
      return 0.3;
    } else if (remainingToPlace <= 2) {
      return 0.1;
    }
    
    return 0;
  }

  private shiftAwareTimePreference(
    day: number,
    startMin: number,
    endMin: number,
    type: CalendarEventType,
    ctx: ScoringContext,
  ): number {
    if (type !== 'workout') {
      return 0;
    }

    const dayShifts = ctx.shifts.filter((shift) => shift.day === day);
    if (dayShifts.length === 0) {
      return 0;
    }

    let score = 0;

    for (const shift of dayShifts) {
      const shiftStart = this.toMinutes(shift.startTime);
      const shiftEnd = this.toMinutes(shift.endTime);
      const commute = shift.commuteMinutes ?? ctx.settings.commuteMinutes ?? 0;

      if (shiftEnd < shiftStart) {
        continue;
      }

      const postShiftStart = Math.min(24 * 60, shiftEnd + commute);
      const latestAllowed = this.toMinutes(ctx.settings.autoPlaceLatestTime);
      const hasUsableAfterWorkWindow = postShiftStart + 30 <= latestAllowed;

      const isAfterWorkCandidate = startMin >= postShiftStart;
      const isBeforeWorkCandidate = endMin <= shiftStart;

      if (hasUsableAfterWorkWindow) {
        if (isAfterWorkCandidate) {
          score += 0.45;
        } else if (isBeforeWorkCandidate) {
          score -= 0.35;
        }
      }
    }

    return score;
  }

  private toMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
