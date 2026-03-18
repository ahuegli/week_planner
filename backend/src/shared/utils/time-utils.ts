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

export function minutesToString(minutes: number): string {
  const hours = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const remaining = (minutes % 60).toString().padStart(2, '0');
  return `${hours}:${remaining}`;
}

export function safeTimeToMinutes(time: string, fallback: number): number {
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
