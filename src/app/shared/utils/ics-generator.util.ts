import { CalendarEvent, PlannedSession, WorkoutLog } from '../../core/models/app-data.models';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function formatIcsDateTime(date: Date): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function parseEventDateTime(dateStr: string | undefined, timeStr: string, fallbackHour: number): Date {
  const base = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
  if (Number.isNaN(base.getTime())) {
    const now = new Date();
    now.setHours(fallbackHour, 0, 0, 0);
    return now;
  }

  const [hoursText, minutesText] = timeStr.split(':');
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  base.setHours(Number.isFinite(hours) ? hours : fallbackHour, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return base;
}

function durationToIcs(minutes: number): string {
  const safe = Math.max(1, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  if (hours > 0 && mins > 0) return `PT${hours}H${mins}M`;
  if (hours > 0) return `PT${hours}H`;
  return `PT${mins}M`;
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function buildSummary(baseTitle: string, distanceKm: number | null | undefined): string {
  if (!distanceKm || distanceKm <= 0) {
    return baseTitle;
  }

  const suffix = Number.isInteger(distanceKm) ? `${distanceKm} km` : `${distanceKm.toFixed(1)} km`;
  return `${baseTitle} - ${suffix}`;
}

function toSessionTypeLabel(sessionType: string): string {
  return sessionType
    .split(/[_-]/g)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function prescriptionDescription(session: PlannedSession): string {
  if (session.prescriptionData) {
    try {
      return JSON.stringify(session.prescriptionData);
    } catch {
      return 'Planned workout';
    }
  }

  return session.purpose?.trim() || 'Planned workout';
}

function createIcs(veventLines: string[]): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:Week Planner',
    'CALSCALE:GREGORIAN',
    ...veventLines,
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

export function generateIcsForEvent(event: CalendarEvent): string {
  const start = parseEventDateTime(event.date, event.startTime, 9);
  const endFromTime = parseEventDateTime(event.date, event.endTime, 10);
  const fallbackMinutes = event.duration ?? event.durationMinutes ?? 45;
  const end = endFromTime > start ? endFromTime : new Date(start.getTime() + (fallbackMinutes * 60000));
  const durationMinutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));

  const summary = buildSummary(event.title, event.distanceTarget ?? event.distanceKm ?? null);
  const description = event.notes?.trim() || 'Planned workout';
  const nowStamp = formatIcsDateTime(new Date());

  return createIcs([
    'BEGIN:VEVENT',
    `UID:event-${event.id}@weekplanner`,
    `DTSTAMP:${nowStamp}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `DTSTART:${formatIcsDateTime(start)}`,
    `DTEND:${formatIcsDateTime(end)}`,
    `DURATION:${durationToIcs(durationMinutes)}`,
    'LOCATION:',
    'END:VEVENT',
  ]);
}

export function generateIcsForLog(log: WorkoutLog): string {
  const start = new Date(log.completedAt);
  const safeStart = Number.isNaN(start.getTime()) ? new Date() : start;
  const durationMinutes = log.actualDuration ?? log.plannedDuration ?? 30;
  const end = new Date(safeStart.getTime() + (durationMinutes * 60000));
  const summaryBase = log.title?.trim() || toSessionTypeLabel(log.sessionType || 'Workout');
  const summary = buildSummary(summaryBase, log.actualDistance ?? null);
  const description = log.notes?.trim() || 'Logged workout';
  const nowStamp = formatIcsDateTime(new Date());

  return createIcs([
    'BEGIN:VEVENT',
    `UID:log-${log.id}@weekplanner`,
    `DTSTAMP:${nowStamp}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `DTSTART:${formatIcsDateTime(safeStart)}`,
    `DTEND:${formatIcsDateTime(end)}`,
    `DURATION:${durationToIcs(durationMinutes)}`,
    'LOCATION:',
    'END:VEVENT',
  ]);
}

export function generateIcsForSession(session: PlannedSession): string {
  const start = session.completedAt ? new Date(session.completedAt) : new Date();
  if (!session.completedAt || Number.isNaN(start.getTime())) {
    const today = new Date();
    today.setHours(9, 0, 0, 0);
    start.setTime(today.getTime());
  }

  const durationMinutes = session.duration || session.minimumDuration || 45;
  const end = new Date(start.getTime() + (durationMinutes * 60000));
  const summary = buildSummary(toSessionTypeLabel(session.sessionType), session.distanceTarget ?? null);
  const description = prescriptionDescription(session);
  const nowStamp = formatIcsDateTime(new Date());

  return createIcs([
    'BEGIN:VEVENT',
    `UID:session-${session.id}@weekplanner`,
    `DTSTAMP:${nowStamp}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `DTSTART:${formatIcsDateTime(start)}`,
    `DTEND:${formatIcsDateTime(end)}`,
    `DURATION:${durationToIcs(durationMinutes)}`,
    'LOCATION:',
    'END:VEVENT',
  ]);
}
