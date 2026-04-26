import { Injectable } from '@nestjs/common';
import {
  CalendarEvent,
  CalendarEventType,
  SchedulerSettings,
  WeekContext,
  WorkoutType,
  getWorkoutFamily,
  isEnduranceType,
} from '../shared/models';

export interface ScoringContext {
  shifts: CalendarEvent[];
  weekContext: WeekContext;
  settings: SchedulerSettings;
  alreadyPlaced: CalendarEvent[];
  candidateWorkout?: {
    workoutType?: WorkoutType;
    isLongEndurance?: boolean;
    durationMinutes?: number;
    sessionType?: string;
    type: 'workout' | 'mealprep';
    intensity?: string;
    cyclePhaseRules?: Record<string, unknown>;
  };
  totalWorkoutsNeeded?: number;
}

@Injectable()
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
    const isLongRun = type === 'workout' && (
      ctx.candidateWorkout?.isLongEndurance === true ||
      (ctx.candidateWorkout?.sessionType?.toLowerCase() ?? '').replace(/\s+/g, '_').includes('long_run')
    );

    const offDay       =  this.offDayBonus(day, type, ctx.shifts, ctx.alreadyPlaced);
    const fatigue      = -this.fatiguePenalty(day, ctx.weekContext.exhaustionByDay);
    const mealPrep     =  this.mealPrepSpacingBonus(day, type, ctx.alreadyPlaced);
    const timeOfDay    =  this.timeOfDayBonus(day, startMin, type, ctx.shifts, ctx.settings);
    const shiftAware   =  this.shiftAwareTimePreference(day, startMin, endMin, type, ctx);
    const freeDay      =  this.longSessionFreeDayBonus(day, startMin, endMin, type, ctx);
    const eventDay     = -this.eventDayPenalty(day, type, ctx.alreadyPlaced);
    const diversity    =  this.diversityComboBonus(day, type, ctx.alreadyPlaced, ctx.candidateWorkout);
    const stacking     = -this.stackingPenalty(day, type, ctx.alreadyPlaced, ctx.candidateWorkout);
    const concentration= -this.dayConcentrationPenalty(day, type, ctx.alreadyPlaced);
    const spread       =  this.spreadBonus(day, type, ctx.alreadyPlaced, ctx.weekContext, ctx.shifts);
    const completion   =  this.completionBonus(type, ctx.alreadyPlaced, ctx.totalWorkoutsNeeded);
    const cycle        =  this.cyclePhaseAdjustment(day, type, ctx);

    const total = offDay + fatigue + mealPrep + timeOfDay + shiftAware + freeDay +
                  eventDay + diversity + stacking + concentration + spread + completion + cycle;

    if (isLongRun) {
      const phase = ctx.weekContext.cyclePhasesByDay?.[day] ?? 'n/a';
      console.log('[LongRunScore]', JSON.stringify({
        day, startMin, phase,
        offDay, fatigue, mealPrep, timeOfDay, shiftAware, freeDay,
        eventDay, diversity, stacking, concentration, spread, completion, cycle,
        total: Number(total.toFixed(4)),
      }));
    }

    return total;
  }

  private offDayBonus(
    day: number,
    type: CalendarEventType,
    shifts: CalendarEvent[],
    alreadyPlaced: CalendarEvent[],
  ): number {
    if (type !== 'workout') {
      return 0;
    }

    const dayShifts = shifts.filter((shift) => shift.day === day);
    if (dayShifts.length === 0) {
      const hasOtherEvents = alreadyPlaced.some(
        (event) => event.day === day && event.type !== 'shift',
      );
      return hasOtherEvents ? 0 : 0.6;
    }

    const hasFreeTimeWindows = dayShifts.some((shift) => {
      const shiftStart = this.toMinutes(shift.startTime);
      const shiftEnd = this.toMinutes(shift.endTime);
      return shiftStart > 0 || shiftEnd < 24 * 60;
    });

    if (hasFreeTimeWindows) {
      return 0.1;
    }

    return 0;
  }

  private spreadBonus(
    day: number,
    type: CalendarEventType,
    alreadyPlaced: CalendarEvent[],
    weekContext: WeekContext,
    shifts: CalendarEvent[],
  ): number {
    if (type !== 'workout') {
      return 0;
    }

    const inWeekWorkouts = alreadyPlaced.filter(
      (event) => event.type === 'workout' && event.day >= 0 && event.day <= 6,
    );

    const hasPrevInWeek = day > 0 && inWeekWorkouts.some((event) => event.day === day - 1);
    const hasPrevAcrossWeekBoundary = day === 0 && (weekContext.previousWeekEndedWithWorkout ?? false);
    const hasPrev = hasPrevInWeek || hasPrevAcrossWeekBoundary;
    const hasNext = day < 6 && inWeekWorkouts.some((event) => event.day === day + 1);

    let bonus = 0;

    if (hasPrev && hasNext) {
      bonus -= 0.3;
    } else if (!(hasPrev || hasNext)) {
      bonus += 0.2;
    }

    // Avoid stacking workouts on shift days when shift-free days are unused.
    // A "shift day" is any day that has at least one shift event.
    const shiftDayNumbers = new Set(shifts.map((s) => s.day));
    const dayHasShift = shiftDayNumbers.has(day);
    if (dayHasShift) {
      const allWeekDays = [0, 1, 2, 3, 4, 5, 6];
      const freeDays = allWeekDays.filter((d) => !shiftDayNumbers.has(d));
      const shiftDayWorkouts = inWeekWorkouts.filter((event) => shiftDayNumbers.has(event.day)).length;
      const freeDayWorkouts = inWeekWorkouts.filter((event) => freeDays.includes(event.day)).length;
      if (shiftDayWorkouts + 1 >= 3 && freeDayWorkouts === 0 && freeDays.length > 0) {
        bonus -= 0.4;
      }
    }

    return bonus;
  }

  private fatiguePenalty(day: number, exhaustionByDay: number[]): number {
    const exhaustion = exhaustionByDay[day] ?? 0;
    return Number(((exhaustion / 10) * 0.5).toFixed(3));
  }

  private mealPrepSpacingBonus(
    day: number,
    type: CalendarEventType,
    alreadyPlaced: CalendarEvent[],
  ): number {
    if (type !== 'mealprep') {
      return 0;
    }

    const existingSessions = alreadyPlaced.filter((e) => e.type === 'mealprep').map((e) => e.day);

    if (existingSessions.length === 0) {
      return 0;
    }

    const minDistance = Math.min(...existingSessions.map((d) => Math.abs(d - day)));
    if (minDistance >= 3) return 0.6;
    if (minDistance === 2) return 0.2;
    return 0;
  }

  private timeOfDayBonus(
    day: number,
    startMin: number,
    type: CalendarEventType,
    shifts: CalendarEvent[],
    settings: SchedulerSettings,
  ): number {
    if (type === 'workout') {
      const preferred = settings.preferredWorkoutTimes ?? [];

      // If no preference set or 'Flexible' selected, fall back to a mild morning default.
      if (preferred.length === 0 || preferred.some((p) => p.toLowerCase() === 'flexible')) {
        return startMin >= 7 * 60 && startMin <= 10 * 60 ? 0.2 : 0;
      }

      // Check each preferred window in priority order.
      for (const pref of preferred) {
        const normalized = pref.toLowerCase();
        if (normalized.includes('late evening') && startMin >= 19 * 60 && startMin < 21 * 60) return 0.2;
        if (normalized.includes('early morning') && startMin >= 5 * 60 && startMin < 7 * 60) return 0.2;
        if (normalized.includes('morning') && !normalized.includes('early') && startMin >= 7 * 60 && startMin < 9 * 60) return 0.2;
        if (normalized.includes('afternoon') && startMin >= 12 * 60 && startMin < 14 * 60) return 0.2;
        if (normalized.includes('evening') && !normalized.includes('late') && startMin >= 17 * 60 && startMin < 19 * 60) return 0.2;
      }
      return 0;
    }

    if (type === 'mealprep') {
      if (startMin >= 10 * 60 && startMin <= 12 * 60) return 0.2;
      if (startMin >= 15 * 60 && startMin <= 17 * 60) return 0.15;
      return 0;
    }

    return 0;
  }

  private eventDayPenalty(
    day: number,
    type: CalendarEventType,
    alreadyPlaced: CalendarEvent[],
  ): number {
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
    candidateWorkout?: {
      workoutType?: WorkoutType;
      isLongEndurance?: boolean;
      type: 'workout' | 'mealprep';
    },
  ): number {
    if (type !== 'workout' || !candidateWorkout?.workoutType || candidateWorkout.isLongEndurance) {
      return 0;
    }

    const candidateFamily = getWorkoutFamily(candidateWorkout.workoutType);
    const sameDayWorkouts = alreadyPlaced.filter(
      (event) => event.type === 'workout' && event.day === day,
    );
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
    candidateWorkout?: {
      workoutType?: WorkoutType;
      isLongEndurance?: boolean;
      type: 'workout' | 'mealprep';
    },
  ): number {
    if (type !== 'workout') return 0;
    if (!candidateWorkout?.workoutType || candidateWorkout.isLongEndurance) return 0;

    const workoutsOnDay = alreadyPlaced.filter((e) => e.type === 'workout' && e.day === day);

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

    const workoutsOnDay = alreadyPlaced.filter(
      (event) => event.type === 'workout' && event.day === day,
    ).length;
    return workoutsOnDay * this.DAY_CONCENTRATION_PENALTY;
  }

  private completionBonus(
    type: CalendarEventType,
    alreadyPlaced: CalendarEvent[],
    totalWorkoutsNeeded?: number,
  ): number {
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
          score += 0.35;
        } else if (isBeforeWorkCandidate) {
          score -= 0.35;
        }
      }
    }

    return score;
  }

  private longSessionFreeDayBonus(
    day: number,
    startMin: number,
    endMin: number,
    type: CalendarEventType,
    ctx: ScoringContext,
  ): number {
    if (type !== 'workout' || !this.isLongOrIntensiveCandidate(ctx.candidateWorkout)) {
      return 0;
    }

    let bonus = 0;
    const dayHasShift = ctx.shifts.some((shift) => shift.day === day);
    if (!dayHasShift) {
      bonus += 0.5;
    }

    const contiguousWindowMinutes = this.calculateContiguousWindowMinutes(
      day,
      startMin,
      endMin,
      ctx,
    );
    if (contiguousWindowMinutes >= 180) {
      bonus += 0.2;
    }

    return bonus;
  }

  private isLongOrIntensiveCandidate(
    candidateWorkout?: {
      workoutType?: WorkoutType;
      isLongEndurance?: boolean;
      durationMinutes?: number;
      sessionType?: string;
      type: 'workout' | 'mealprep';
    },
  ): boolean {
    if (!candidateWorkout || candidateWorkout.type !== 'workout') {
      return false;
    }

    const duration = candidateWorkout.durationMinutes ?? 0;
    const sessionType = candidateWorkout.sessionType?.toLowerCase() ?? '';
    const workoutType = candidateWorkout.workoutType;
    const isBikeOrSwimLongish =
      (workoutType === 'biking' || workoutType === 'swimming') && duration >= 45;

    return (
      duration >= 60 ||
      candidateWorkout.isLongEndurance === true ||
      sessionType.includes('long') ||
      isBikeOrSwimLongish
    );
  }

  private calculateContiguousWindowMinutes(
    day: number,
    startMin: number,
    endMin: number,
    ctx: ScoringContext,
  ): number {
    const earliestMin = this.toMinutes(ctx.settings.autoPlaceEarliestTime);
    const latestMin = this.toMinutes(ctx.settings.autoPlaceLatestTime);
    const timelineStart = Number.isNaN(earliestMin) ? 6 * 60 : earliestMin;
    const timelineEnd = Number.isNaN(latestMin) || latestMin <= timelineStart ? 22 * 60 : latestMin;

    const occupiedForDay = [...ctx.alreadyPlaced, ...ctx.shifts]
      .filter((event) => event.day === day)
      .map((event) => ({
        start: this.toMinutes(event.startTime),
        end: this.toMinutes(event.endTime),
      }))
      .filter((interval) => !Number.isNaN(interval.start) && !Number.isNaN(interval.end))
      .sort((a, b) => a.start - b.start);

    let windowStart = timelineStart;
    let windowEnd = timelineEnd;

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

    return Math.max(0, windowEnd - windowStart);
  }

  private toMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private cyclePhaseAdjustment(
    day: number,
    type: CalendarEventType,
    ctx: ScoringContext,
  ): number {
    if (type !== 'workout') return 0;
    if (!ctx.weekContext.cycleTrackingEnabled) return 0;

    const phasesByDay = ctx.weekContext.cyclePhasesByDay;
    const confidence = ctx.weekContext.cycleConfidence ?? 0;
    if (!phasesByDay || phasesByDay.length !== 7 || confidence === 0) return 0;

    const phase = phasesByDay[day];
    if (phase === 'unknown') return 0;

    const sessionType = (ctx.candidateWorkout?.sessionType?.toLowerCase() ?? '').replace(/\s+/g, '_');
    const workoutType = ctx.candidateWorkout?.workoutType;

    // Classify the candidate as endurance vs strength, hard vs not
    const isEndurance = workoutType === 'running' || workoutType === 'biking' || workoutType === 'swimming';
    const isStrength = workoutType === 'strength';
    const isHardEndurance = isEndurance && (
      sessionType.includes('intervals') ||
      sessionType.includes('tempo') ||
      sessionType.includes('hill') ||
      sessionType.includes('long_run') ||
      (ctx.candidateWorkout?.isLongEndurance === true)
    );
    const isHardStrength = isStrength && (sessionType === 'strength' || sessionType === 'hiit');
    const isExplosive = sessionType.includes('hiit') || sessionType.includes('plyo');

    // Penalty matrix from research-backed methodology
    let raw = 0;

    if (phase === 'luteal') {
      if (isHardEndurance) raw = -0.6;
      else if (isHardStrength) raw = -0.3;
    } else if (phase === 'menstrual') {
      if (isHardEndurance) raw = -0.5;
      else if (isHardStrength) raw = -0.2;
    } else if (phase === 'follicular') {
      if (isHardEndurance) raw = +0.2;
      else if (isHardStrength) raw = +0.2;
    } else if (phase === 'ovulation') {
      if (isExplosive) raw = -0.1; // injury caution flag, soft penalty
      else if (isHardEndurance) raw = +0.1;
    }

    // Apply per-session cyclePhaseRules on top of phase defaults
    const phaseRules = ctx.candidateWorkout?.cyclePhaseRules;
    if (phaseRules) {
      const rules = phaseRules[phase] as Record<string, unknown> | undefined;
      if (rules) {
        const isHardByIntensity = ctx.candidateWorkout?.intensity === 'hard';
        const isHard = isHardEndurance || isHardStrength || isHardByIntensity;
        if (rules['maxIntensity'] === 'moderate' && isHard) raw -= 0.2;
        if (rules['preferred'] === true) raw += 0.2;
        if (rules['priorityOverride'] === 'supporting') raw -= 0.1;
      }
    }

    return raw * confidence;
  }
}
