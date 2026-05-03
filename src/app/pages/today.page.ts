import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UiFeedbackService } from '../shared/ui-feedback.service';
import {
  CalendarEvent,
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
import { EventDetailModalComponent } from '../shared/event-detail-modal/event-detail-modal.component';
import { QuickLogModalComponent } from '../features/workout-log/quick-log-modal.component';
import { DataStoreService } from '../core/services/data-store.service';
import { AuthService } from '../core/services/auth.service';
import { Note, WeekDay, WorkoutLog } from '../core/models/app-data.models';

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

const RECAP_START_HOUR = 21;
const RECAP_TRANSITION_MS = 300;
const RECAP_MOBILE_MAX_WIDTH = 768;
const RECAP_DISMISS_KEY_PREFIX = 'day_recap_dismissed_';
const RECAP_TEST_NOW_KEY = 'day_recap_test_now';

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
    EventDetailModalComponent,
    QuickLogModalComponent,
  ],
  templateUrl: './today.page.html',
  styleUrl: './today.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodayPageComponent {
  private readonly dataStore = inject(DataStoreService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly uiFeedback = inject(UiFeedbackService);
  private readonly initialNow = this.resolveCurrentDate();
  private readonly today = signal(this.initialNow);
  protected readonly selectedDate = signal(this.initialNow);
  protected readonly expandedEventId = signal<string | null>(null);
  protected readonly quickCreateOpen = signal(false);
  protected readonly quickCreateDraft = signal<CalendarEvent | null>(null);
  protected readonly quickLogOpen = signal(false);
  protected readonly editingWorkoutLogId = signal<string | null>(null);
  private readonly nowMinutes = signal(this.initialNow.getHours() * 60 + this.initialNow.getMinutes());
  protected readonly hasLoaded = signal(false);
  protected readonly recapState = signal<'hidden' | 'entering' | 'visible' | 'leaving'>('hidden');
  protected readonly cycleTrackingEnabled = computed(
    () => this.dataStore.schedulerSettings()?.cycleTrackingEnabled === true,
  );
  protected readonly pendingInvitations = computed(() => this.dataStore.pendingInvitations());
  protected readonly errorInvitationId = signal<string | null>(null);

  protected readonly formattedDate = computed(() =>
    new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(this.selectedDate()),
  );

  protected readonly greeting = computed(() => {
    const hours = this.today().getHours();
    if (hours < 12) {
      return 'Good morning';
    }
    if (hours < 18) {
      return 'Good afternoon';
    }
    if (hours < 22) {
      return 'Good evening';
    }
    return 'Late night';
  });

  protected readonly firstName = computed(() => {
    const name = this.authService.currentUser()?.name?.trim();
    if (!name) {
      return null;
    }

    const [firstName] = name.split(/\s+/);
    return firstName || null;
  });

  protected readonly pageGreeting = computed(() => {
    const firstName = this.firstName();
    return firstName ? `${this.greeting()}, ${firstName}` : this.greeting();
  });

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
  protected readonly showCycleAwareTip = computed(() => this.cycleTrackingEnabled());

  protected readonly todayDateString = computed(() => {
    const value = this.today();
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  protected readonly selectedDateString = computed(() => this.toDateString(this.selectedDate()));
  protected readonly todayHour = computed(() => this.today().getHours());
  protected readonly tomorrowDateString = computed(() => {
    const tomorrow = new Date(this.today());
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.toDateString(tomorrow);
  });
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

  protected readonly remindersDueToday = computed<Note[]>(() => {
    const today = this.todayDateString();
    return this.dataStore.notes()
      .filter(
        (n) =>
          n.noteType === 'reminder' &&
          n.dueDate !== null &&
          n.dueDate <= today &&
          !n.completed,
      )
      .sort((a, b) => {
        const timeA = a.dueTime ?? '';
        const timeB = b.dueTime ?? '';
        if (timeA && timeB) return timeA.localeCompare(timeB);
        if (timeA) return -1;
        if (timeB) return 1;
        return a.title.localeCompare(b.title);
      });
  });

  protected readonly todayOffPlanLogs = computed(() => {
    const dateStr = this.selectedDateString();
    return this.dataStore.workoutLogs()
      .filter((log) => !log.plannedSessionId && this.toDateString(new Date(log.completedAt)) === dateStr)
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  });

  protected readonly tomorrowWorkoutEvents = computed(() =>
    this.dataStore
      .eventsForDay(this.tomorrowDateString())
      .filter((event) => event.type === 'workout')
      .slice()
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)),
  );

  protected readonly tomorrowFirstWorkout = computed(() => this.tomorrowWorkoutEvents()[0] ?? null);

  protected readonly tomorrowAdditionalCount = computed(() => {
    const count = this.tomorrowWorkoutEvents().length;
    return count > 1 ? count - 1 : 0;
  });

  protected readonly editingWorkoutLog = computed<WorkoutLog | null>(() => {
    const id = this.editingWorkoutLogId();
    if (!id) {
      return null;
    }

    return this.dataStore.getWorkoutLogById(id);
  });

  protected readonly completedWorkoutEventsToday = computed(() =>
    this.dataStore
      .eventsForDay(this.todayDateString())
      .filter((event) => event.type === 'workout' && event.status === 'completed'),
  );

  protected readonly completedOffPlanWorkoutLogsToday = computed(() =>
    this.dataStore
      .workoutLogs()
      .filter((log) => !log.plannedSessionId && this.toDateString(new Date(log.completedAt)) === this.todayDateString()),
  );

  protected readonly recapCompletedWorkoutsCount = computed(() =>
    this.completedWorkoutEventsToday().length + this.completedOffPlanWorkoutLogsToday().length,
  );

  protected readonly recapCompletedTasksCount = computed(() =>
    this.dataStore
      .notes()
      .filter(
        (note) =>
          note.noteType === 'task' &&
          note.completed &&
          note.completedAt !== null &&
          this.toDateString(new Date(note.completedAt)) === this.todayDateString(),
      ).length,
  );

  protected readonly recapWorkoutDurationMinutes = computed(() => {
    const fromEvents = this.completedWorkoutEventsToday().reduce((sum, event) => {
      const direct = event.duration ?? event.durationMinutes;
      if (direct && direct > 0) {
        return sum + direct;
      }

      const diff = timeToMinutes(event.endTime) - timeToMinutes(event.startTime);
      return diff > 0 ? sum + diff : sum;
    }, 0);

    const fromOffPlanLogs = this.completedOffPlanWorkoutLogsToday().reduce(
      (sum, log) => sum + (log.actualDuration ?? log.plannedDuration ?? 0),
      0,
    );

    return fromEvents + fromOffPlanLogs;
  });

  protected readonly recapStreakDays = computed(() => {
    const doneTasks = this.dataStore
      .notes()
      .filter((note) => note.noteType === 'task' && note.completed && note.completedAt)
      .map((note) => this.toDateString(new Date(note.completedAt!)));

    const workoutDays = this.dataStore.workoutLogs().map((log) => this.toDateString(new Date(log.completedAt)));
    const completionDays = new Set([...doneTasks, ...workoutDays]);

    let streak = 0;
    const cursor = new Date(this.today());

    while (completionDays.has(this.toDateString(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  });

  protected readonly recapTomorrowSummary = computed(() => {
    const workouts = this.tomorrowWorkoutEvents();
    if (workouts.length === 0) {
      return 'Free day tomorrow — rest up.';
    }

    if (workouts.length > 1) {
      return 'Multiple sessions tomorrow';
    }

    const first = workouts[0];
    const duration = this.previewDuration(first);
    return duration
      ? `Tomorrow: ${first.title}, ${duration}`
      : `Tomorrow: ${first.title}`;
  });

  protected readonly recapShouldRender = computed(() => this.recapState() !== 'hidden');
  protected readonly recapIsVisible = computed(() => this.recapState() === 'visible' || this.recapState() === 'entering');
  protected readonly recapIsLeaving = computed(() => this.recapState() === 'leaving');

  constructor() {
    this.load();

    effect(() => {
      if (!this.hasLoaded()) {
        return;
      }

      if (this.recapState() !== 'hidden') {
        return;
      }

      if (this.shouldShowRecap()) {
        this.openRecap();
      }
    });
  }

  private async load(): Promise<void> {
    void this.dataStore.loadInvitations();

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
    void this.router.navigate(['/coach']);
  }

  protected openQuickCreate(type: 'workout' | 'shift'): void {
    this.quickCreateDraft.set(this.buildDraftEvent(type));
    this.quickCreateOpen.set(true);
  }

  protected closeQuickCreate(): void {
    this.quickCreateOpen.set(false);
    this.quickCreateDraft.set(null);
  }

  protected async saveQuickCreate(event: CalendarEvent): Promise<void> {
    await this.dataStore.addCalendarEvent(this.toCreatePayload(event));
    this.closeQuickCreate();
  }

  protected openQuickLog(log?: WorkoutLog): void {
    this.editingWorkoutLogId.set(log?.id ?? null);
    this.quickLogOpen.set(true);
  }

  protected closeQuickLog(): void {
    this.editingWorkoutLogId.set(null);
    this.quickLogOpen.set(false);
  }

  protected onLogSaved(_log: WorkoutLog): void {
    // workoutLogs signal already updated in data-store; computed todayOffPlanLogs reacts automatically
  }

  protected editLoggedWorkout(log: WorkoutLog): void {
    this.openQuickLog(log);
  }

  protected labelForType(sessionType: string): string {
    const map: Record<string, string> = {
      running: 'Run', cycling: 'Ride', swimming: 'Swim',
      strength: 'Strength', yoga_mobility: 'Yoga / Mobility',
      pilates: 'Pilates', hiit: 'HIIT', walking_hiking: 'Walk / Hike', other: 'Workout',
    };
    return map[sessionType] ?? sessionType;
  }

  protected formatLogMeta(log: WorkoutLog): string {
    const parts: string[] = [];
    if (log.actualDuration) parts.push(this.formatDuration(log.actualDuration));
    if (log.actualDistance) {
      const d = log.actualDistance;
      parts.push(`${d % 1 === 0 ? d.toFixed(0) : d.toFixed(1)} km`);
    }
    if (log.energyRating) parts.push(log.energyRating.charAt(0).toUpperCase() + log.energyRating.slice(1));
    return parts.join(' · ');
  }

  protected openTaskCreate(): void {
    void this.router.navigate(['/notes']);
  }

  protected async completeReminder(note: Note): Promise<void> {
    await this.dataStore.toggleNoteComplete(note.id, true);
  }

  protected navigateToNote(note: Note): void {
    void this.router.navigate(['/notes'], { queryParams: { id: note.id } });
  }

  protected formatInviteDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(`${dateStr}T00:00:00`);
    return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
  }

  protected async acceptInvitation(id: string): Promise<void> {
    this.errorInvitationId.set(null);
    try {
      await this.dataStore.respondToInvitation(id, 'accepted');
      this.uiFeedback.show('Added to your calendar');
    } catch {
      this.errorInvitationId.set(id);
    }
  }

  protected async declineInvitation(id: string): Promise<void> {
    await this.dataStore.respondToInvitation(id, 'declined');
  }

  protected async openTomorrowInWeekView(): Promise<void> {
    if (!this.tomorrowFirstWorkout()) {
      return;
    }

    await this.router.navigate(['/week'], { queryParams: { date: this.tomorrowDateString() } });
  }

  protected dismissRecap(): void {
    this.setDismissedForToday();
    this.recapState.set('leaving');

    setTimeout(() => {
      this.recapState.set('hidden');
    }, RECAP_TRANSITION_MS);
  }

  protected previewDuration(event: CalendarEvent): string | null {
    const fromEvent = event.duration ?? event.durationMinutes;
    if (fromEvent && fromEvent > 0) {
      return this.formatDuration(fromEvent);
    }

    const start = timeToMinutes(event.startTime);
    const end = timeToMinutes(event.endTime);
    const diff = end - start;
    if (diff > 0) {
      return this.formatDuration(diff);
    }

    return null;
  }

  protected previewDistance(event: CalendarEvent): string | null {
    const distance = event.distanceTarget ?? event.distanceKm;
    if (!distance || distance <= 0) {
      return null;
    }

    return `${distance % 1 === 0 ? distance.toFixed(0) : distance.toFixed(1)} km`;
  }

  protected previewMeta(event: CalendarEvent): string | null {
    const duration = this.previewDuration(event);
    const distance = this.previewDistance(event);

    if (duration && distance) {
      return `${duration} · ${distance}`;
    }

    return duration ?? distance;
  }

  private formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
  }

  protected recapDurationLabel(): string {
    const minutes = this.recapWorkoutDurationMinutes();
    if (minutes <= 0) {
      return '';
    }

    return this.formatDuration(minutes);
  }

  private buildDraftEvent(type: 'workout' | 'shift'): CalendarEvent {
    const date = this.selectedDateString();
    const day = this.dayOfWeekIndex(date);

    const base: CalendarEvent = {
      id: `new-${type}-${Date.now()}`,
      title: type === 'workout' ? 'Workout' : 'Work Shift',
      type,
      day,
      date,
      startTime: type === 'workout' ? '17:00' : '08:00',
      endTime: type === 'workout' ? '17:45' : '16:00',
      isManuallyPlaced: true,
    };

    if (type === 'workout') {
      return {
        ...base,
        duration: 45,
        durationMinutes: 45,
        intensity: 'moderate',
        priority: 'supporting',
        sessionType: 'running',
      };
    }

    return {
      ...base,
      commuteMinutes: 30,
    };
  }

  private toCreatePayload(event: CalendarEvent): Partial<CalendarEvent> {
    const { id, ...payload } = event;
    return payload;
  }

  private dayOfWeekIndex(date: string): number {
    return (new Date(`${date}T00:00:00`).getDay() + 6) % 7;
  }

  private toDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private resolveCurrentDate(): Date {
    try {
      const override = localStorage.getItem(RECAP_TEST_NOW_KEY);
      if (override) {
        const parsed = new Date(override);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    } catch {
      // localStorage may be unavailable in some contexts
    }

    return new Date();
  }

  private shouldShowRecap(): boolean {
    if (this.todayHour() < RECAP_START_HOUR) {
      return false;
    }

    if (this.isSmallViewport()) {
      return false;
    }

    if (this.recapCompletedWorkoutsCount() + this.recapCompletedTasksCount() === 0) {
      return false;
    }

    if (this.wasDismissedToday()) {
      return false;
    }

    return true;
  }

  private openRecap(): void {
    this.recapState.set('entering');
    setTimeout(() => {
      this.recapState.set('visible');
    }, 16);
  }

  private dismissalKeyForToday(): string {
    return `${RECAP_DISMISS_KEY_PREFIX}${this.todayDateString()}`;
  }

  private wasDismissedToday(): boolean {
    try {
      return localStorage.getItem(this.dismissalKeyForToday()) === '1';
    } catch {
      return false;
    }
  }

  private setDismissedForToday(): void {
    try {
      localStorage.setItem(this.dismissalKeyForToday(), '1');
    } catch {
      // localStorage may be unavailable in some contexts
    }
  }

  private isSmallViewport(): boolean {
    const layoutWidth = window.innerWidth;
    const physicalWidth = window.screen?.width ?? layoutWidth;
    const effectiveWidth = Math.min(layoutWidth, physicalWidth);
    return effectiveWidth <= RECAP_MOBILE_MAX_WIDTH;
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
