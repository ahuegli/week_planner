import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CalendarEvent, Note, SlotCandidate } from '../models/app-data.models';
import { DataStoreService } from './data-store.service';
import { SchedulerApiService } from './scheduler-api.service';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

@Injectable({ providedIn: 'root' })
export class SlotSuggestionService {
  constructor(
    private readonly dataStore: DataStoreService,
    private readonly schedulerApi: SchedulerApiService,
  ) {}

  async suggestSlotsForNote(note: Note, count = 3): Promise<SlotCandidate[]> {
    const settings = this.dataStore.schedulerSettings();
    if (!settings) return [];

    const earliest = this.parseTime(settings.autoPlaceEarliestTime ?? '06:00');
    const latest = this.parseTime(settings.autoPlaceLatestTime ?? '22:00');
    const duration = note.estimatedDurationMinutes ?? 30;

    const weekStart = this.resolveWeekStart(note.dueDate);
    const weekEnd = this.shiftDate(weekStart, 6);

    const weekEvents = this.dataStore.calendarEvents().filter(
      (e) => !!e.date && e.date >= weekStart && e.date <= weekEnd,
    );

    // One candidate per 90-min block per day reduces scoring calls to ~50 for a full week
    // (compared to ~200 if we scored every 30-min window).
    const candidates: Array<{ day: number; date: string; startMin: number }> = [];

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = this.shiftDate(weekStart, dayOffset);
      const dayEvents = weekEvents.filter((e) => e.date === date);

      for (let blockStart = earliest; blockStart + duration <= latest; blockStart += 90) {
        const blockEnd = Math.min(blockStart + 90, latest);
        for (let start = blockStart; start + duration <= blockEnd; start += 30) {
          if (!this.overlapsEvents(start, start + duration, dayEvents)) {
            candidates.push({ day: dayOffset, date, startMin: start });
            break; // one slot per 90-min block
          }
        }
      }
    }

    const scored = await Promise.all(
      candidates.map(async (c) => {
        try {
          const result = await firstValueFrom(
            this.schedulerApi.score({
              day: c.day,
              startMin: c.startMin,
              endMin: c.startMin + duration,
              type: 'workout', // notes aren't workouts; type 'workout' gives valid timing scores
              existingEvents: weekEvents,
              settings,
            }),
          );
          return { ...c, score: result.score };
        } catch {
          return { ...c, score: 0 };
        }
      }),
    );

    scored.sort((a, b) => b.score - a.score);

    const seen = new Set<number>();
    const results: SlotCandidate[] = [];

    for (const c of scored) {
      if (seen.has(c.day)) continue;
      seen.add(c.day);

      const endMin = c.startMin + duration;
      results.push({
        day: c.day,
        date: c.date,
        startTime: this.formatTime(c.startMin),
        endTime: this.formatTime(endMin),
        score: c.score,
        label: `${DAY_NAMES[c.day]} ${this.formatTime(c.startMin)}`,
      });

      if (results.length >= count) break;
    }

    return results;
  }

  private resolveWeekStart(dueDate: string | null): string {
    const ref = dueDate ? new Date(`${dueDate}T00:00:00`) : new Date();
    if (dueDate) {
      // Monday of the week containing dueDate
      const daysFromMonday = (ref.getDay() + 6) % 7;
      ref.setDate(ref.getDate() - daysFromMonday);
    } else {
      // Upcoming Monday: 0 days if today is Monday, otherwise days until next Monday
      const daysToMonday = (8 - ref.getDay()) % 7;
      ref.setDate(ref.getDate() + daysToMonday);
    }
    return this.toDateString(ref);
  }

  private overlapsEvents(startMin: number, endMin: number, events: CalendarEvent[]): boolean {
    const BUFFER = 15;
    for (const event of events) {
      if (!event.startTime || !event.endTime) continue;
      const eStart = this.parseTime(event.startTime) - BUFFER;
      const eEnd = this.parseTime(event.endTime) + BUFFER;
      if (startMin < eEnd && endMin > eStart) return true;
    }
    return false;
  }

  private parseTime(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private formatTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private shiftDate(date: string, offset: number): string {
    const d = new Date(`${date}T00:00:00`);
    d.setDate(d.getDate() + offset);
    return this.toDateString(d);
  }

  private toDateString(date: Date): string {
    const y = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${mo}-${d}`;
  }
}
