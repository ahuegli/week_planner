import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  MOCK_DID_YOU_KNOW,
  MOCK_REMINDER,
  MOCK_TIP,
} from '../mock-data';
import { ReminderCardComponent } from '../features/today/reminder-card/reminder-card.component';
import { CycleBannerComponent } from '../features/today/cycle-banner/cycle-banner.component';
import { DailyTipCardComponent } from '../features/today/daily-tip-card/daily-tip-card.component';
import { EventCardComponent } from '../features/today/event-card/event-card.component';
import { NowMarkerComponent } from '../features/today/now-marker/now-marker.component';
import { WeekSnapshotComponent } from '../features/today/week-snapshot/week-snapshot.component';
import { IHaveTimeComponent } from '../features/today/i-have-time/i-have-time.component';
import { DidYouKnowComponent } from '../features/today/did-you-know/did-you-know.component';
import { DataStoreService } from '../core/services/data-store.service';
import { WeekDay } from '../core/models/app-data.models';
import { cycleTrackingEnabled } from '../shared/state/cycle-ui.state';

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

@Component({
  selector: 'app-today-page',
  standalone: true,
  imports: [
    RouterLink,
    ReminderCardComponent,
    CycleBannerComponent,
    DailyTipCardComponent,
    EventCardComponent,
    NowMarkerComponent,
    WeekSnapshotComponent,
    IHaveTimeComponent,
    DidYouKnowComponent,
  ],
  templateUrl: './today.page.html',
  styleUrl: './today.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodayPageComponent {
  private readonly dataStore = inject(DataStoreService);
  private readonly today = signal(new Date());
  protected readonly selectedDate = signal(new Date());
  protected readonly expandedEventId = signal<string | null>(null);
  private readonly nowMinutes = signal(new Date().getHours() * 60 + new Date().getMinutes());
  protected readonly hasLoaded = signal(false);
  protected readonly cycleTrackingEnabled = cycleTrackingEnabled;

  protected readonly formattedDate = computed(() =>
    new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(this.selectedDate()),
  );

  protected readonly reminder = MOCK_REMINDER;
  protected readonly tip = MOCK_TIP;
  protected readonly didYouKnow = MOCK_DID_YOU_KNOW;
  protected readonly isLoading = computed(() => this.dataStore.isLoading());

  protected readonly selectedDayTitle = computed(() => {
    const selected = this.selectedDateString();
    if (selected === this.todayDateString()) {
      return 'Today';
    }

    return new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(this.selectedDate());
  });

  protected readonly currentPhase = computed(() => this.dataStore.currentPhase());
  protected readonly showCycleBanner = computed(
    () => this.cycleTrackingEnabled() && !!this.currentPhase() && this.currentPhase()!.phase !== 'unknown',
  );

  protected readonly todayDateString = computed(() => {
    const value = this.today();
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  protected readonly selectedDateString = computed(() => this.toDateString(this.selectedDate()));
  protected readonly currentPlan = computed(() => this.dataStore.currentPlan());
  protected readonly showCoachAdjustmentPrompt = computed(() => this.dataStore.showCoachAdjustmentPrompt());
  protected readonly recentSkippedKeyCount = computed(() => this.dataStore.recentSkippedKeyCount());

  protected readonly selectedWeekMeta = computed(() => this.resolveWeekMeta(this.selectedDateString()));

  protected readonly selectedPhase = computed(() => this.selectedWeekMeta()?.phase ?? 'base');

  protected readonly selectedWeekNumber = computed(() => this.selectedWeekMeta()?.weekNumber ?? 1);

  protected readonly todayEvents = computed(() => this.dataStore.eventsForDay(this.selectedDateString()));

  protected readonly pastEvents = computed(() =>
    this.todayEvents().filter((event) => timeToMinutes(event.endTime) <= this.nowMinutes()),
  );

  protected readonly futureEvents = computed(() =>
    this.todayEvents().filter((event) => timeToMinutes(event.endTime) > this.nowMinutes()),
  );

  protected readonly weekDays = computed<WeekDay[]>(() => {
    const start = new Date(this.selectedDate());
    const day = start.getDay();
    const diff = (day + 6) % 7;
    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);

    const weekStart = this.toDateString(start);
    const events = this.dataStore.eventsForWeek(weekStart);
    const labels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

    return labels.map((label, index) => {
      const current = new Date(start);
      current.setDate(start.getDate() + index);
      const dateKey = this.toDateString(current);
      const dayEvents = events.filter((event) => (event.date ?? '') === dateKey);
      const workouts = dayEvents.filter((event) => event.type === 'workout');

      return {
        label,
        date: dateKey,
        hasWorkout: dayEvents.some((event) => event.type === 'workout'),
        hasShift: dayEvents.some((event) => event.type === 'shift'),
        isToday: dateKey === this.todayDateString(),
        isSelected: dateKey === this.selectedDateString(),
        isCompleted: workouts.length > 0 && workouts.every((event) => event.status === 'completed'),
      };
    });
  });

  protected readonly hasAnyEvents = computed(
    () => this.pastEvents().length > 0 || this.futureEvents().length > 0,
  );

  constructor() {
    this.load();
  }

  private async load(): Promise<void> {
    if (this.dataStore.isLoaded()) {
      if (this.cycleTrackingEnabled() && !this.dataStore.currentPhase()) {
        await this.dataStore.loadCycle();
      }
      this.hasLoaded.set(true);
      return;
    }

    await this.dataStore.loadAll();
    this.hasLoaded.set(true);
  }

  protected toggleEventExpansion(eventId: string): void {
    this.expandedEventId.update((current) => (current === eventId ? null : eventId));
  }

  protected selectDay(date: string): void {
    const selected = new Date(`${date}T00:00:00`);
    if (Number.isNaN(selected.getTime())) {
      return;
    }

    this.selectedDate.set(selected);
    this.expandedEventId.set(null);
  }

  protected openCoachAdjustmentPrompt(): void {
    console.log('[WeekPlanner] Coach adjustment prompt tapped');
  }

  private toDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private resolveWeekMeta(date: string): { phase: string; weekNumber: number } | null {
    const target = new Date(`${date}T00:00:00`);
    if (Number.isNaN(target.getTime())) {
      return null;
    }

    for (const week of this.dataStore.planWeeks()) {
      const start = new Date(`${week.startDate}T00:00:00`);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      if (target >= start && target <= end) {
        return {
          phase: week.phase,
          weekNumber: week.weekNumber,
        };
      }
    }

    return null;
  }
}
