import { CalendarEvent } from '../models/calendar-event.model';

export interface TimeInterval {
  day: number;
  start: number;
  end: number;
}

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function toTimeString(totalMinutes: number): string {
  const minutesInDay = 24 * 60;
  const normalized = ((totalMinutes % minutesInDay) + minutesInDay) % minutesInDay;
  const hours = Math.floor(normalized / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (normalized % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function addMinutes(time: string, amount: number): string {
  return toTimeString(toMinutes(time) + amount);
}

export function eventIntervals(event: CalendarEvent): TimeInterval[] {
  const start = toMinutes(event.startTime);
  const end = toMinutes(event.endTime);

  if (end > start) {
    return [{ day: event.day, start, end }];
  }

  return [
    { day: event.day, start, end: 24 * 60 },
    { day: (event.day + 1) % 7, start: 0, end },
  ];
}

export function overlaps(a: TimeInterval, b: TimeInterval): boolean {
  if (a.day !== b.day) {
    return false;
  }

  return a.start < b.end && b.start < a.end;
}
