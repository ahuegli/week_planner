import { Injectable } from '@angular/core';
import { CalendarEvent, CalendarEventType } from '../models/calendar-event.model';
import { SchedulerSettings } from '../models/scheduler-settings.model';
import { WeekContext } from '../models/week context.model';

export interface ScoringContext {
  shifts: CalendarEvent[];
  weekContext: WeekContext;
  settings: SchedulerSettings;
  alreadyPlaced: CalendarEvent[];
}

@Injectable({
  providedIn: 'root',
})
export class ScoringEngineService {
  score(
    day: number,
    startMin: number,
    type: CalendarEventType,
    ctx: ScoringContext,
  ): number {
    let total = 0;

    total += this.offDayBonus(day, type, ctx.shifts);
    total -= this.fatiguePenalty(day, ctx.weekContext.exhaustionByDay);
    total -= this.commutePenalty(day, ctx.weekContext.commuteByDay, ctx.settings);
    total += this.mealPrepSpacingBonus(day, type, ctx.alreadyPlaced);
    total += this.timeOfDayBonus(startMin, type);
    total -= this.stackingPenalty(day, type, ctx.alreadyPlaced);

    return total;
  }

  private offDayBonus(day: number, type: CalendarEventType, shifts: CalendarEvent[]): number {
    if (type !== 'workout') {
      return 0;
    }
    const hasShift = shifts.some((s) => s.day === day);
    return hasShift ? 0 : 20;
  }

  private fatiguePenalty(day: number, exhaustionByDay: number[]): number {
    const exhaustion = exhaustionByDay[day] ?? 0;
    return Math.round((exhaustion / 10) * 30);
  }

  private commutePenalty(
    day: number,
    commuteByDay: boolean[],
    settings: SchedulerSettings,
  ): number {
    if (!commuteByDay[day]) {
      return 0;
    }
    return Math.min(Math.round(settings.commuteMinutes / 10), 15);
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
    if (minDistance >= 3) return 15;
    if (minDistance === 2) return 5;
    return 0;
  }

  private timeOfDayBonus(startMin: number, type: CalendarEventType): number {
    if (type === 'workout') {
      if (startMin >= 7 * 60 && startMin <= 9 * 60) return 10;
      if (startMin >= 17 * 60 && startMin <= 19 * 60) return 8;
      return 0;
    }

    if (type === 'mealprep') {
      if (startMin >= 10 * 60 && startMin <= 12 * 60) return 8;
      if (startMin >= 15 * 60 && startMin <= 17 * 60) return 5;
      return 0;
    }

    return 0;
  }

  private stackingPenalty(
    day: number,
    type: CalendarEventType,
    alreadyPlaced: CalendarEvent[],
  ): number {
    if (type !== 'workout') return 0;
    const workoutsOnDay = alreadyPlaced.filter(
      (e) => e.type === 'workout' && e.day === day,
    ).length;
    return workoutsOnDay * 40;
  }
}
