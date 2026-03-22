import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DateCalculationService {
  private readonly dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  /**
   * Get the Monday of the week for a given date
   */
  getWeekStartDate(date: Date = new Date()): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
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
   * Get today's day index (0=Mon, 6=Sun)
   */
  getTodayIndex(): number {
    const jsDay = new Date().getDay();
    return jsDay === 0 ? 6 : jsDay - 1;
  }

  /**
   * Get current time as HH:MM string
   */
  getCurrentTime(): string {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  /**
   * Convert HH:MM time string to minutes since midnight
   */
  timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Convert minutes since midnight to HH:MM time string
   */
  minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  /**
   * Calculate week offset from current week for a given date
   */
  getWeekOffsetForDate(date: Date): number {
    const now = new Date();
    const currentWeekStart = this.getWeekStartDate(now);
    const targetWeekStart = this.getWeekStartDate(date);
    const diffTime = targetWeekStart.getTime() - currentWeekStart.getTime();
    return Math.round(diffTime / (7 * 24 * 60 * 60 * 1000));
  }

  /**
   * Get week dates with offset from current week
   */
  getWeekDatesWithOffset(weekOffset: number): { start: Date; end: Date } {
    const today = new Date();
    const jsDay = today.getDay();
    const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + mondayOffset + weekOffset * 7);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return { start: weekStart, end: weekEnd };
  }

  /**
   * Get formatted week label string (e.g., "Mar 18 - 24, 2026")
   */
  getWeekLabel(weekOffset: number): string {
    const { start: weekStart, end: weekEnd } = this.getWeekDatesWithOffset(weekOffset);

    const startMonth = weekStart.toLocaleString('default', { month: 'short' });
    const endMonth = weekEnd.toLocaleString('default', { month: 'short' });
    const startDay = weekStart.getDate();
    const endDay = weekEnd.getDate();
    const year = weekEnd.getFullYear();

    if (weekStart.getMonth() === weekEnd.getMonth()) {
      return `${startMonth} ${startDay} - ${endDay}, ${year}`;
    }

    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
  }

  /**
   * Get array of date labels for a week (e.g., ["18 Mar", "19 Mar", ...])
   */
  getWeekDateLabels(weekOffset: number): string[] {
    const { start } = this.getWeekDatesWithOffset(weekOffset);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })}`;
    });
  }

  /**
   * Get today's date as a formatted string
   */
  getTodayDateString(): string {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  /**
   * Get the day labels array
   */
  getDayLabels(): string[] {
    return [...this.dayLabels];
  }
}
