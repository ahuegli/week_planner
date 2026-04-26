import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { DayRowComponent } from '../features/week/day-row/day-row.component';
import { MonthGridComponent } from '../features/week/month-grid/month-grid.component';
import { QuickAddFabComponent } from '../features/week/quick-add-fab/quick-add-fab.component';
import { ShareMonthComponent } from '../features/week/share-month/share-month.component';
import { ViewToggleComponent, WeekViewMode } from '../features/week/view-toggle/view-toggle.component';
import { WeekSummaryComponent } from '../features/week/week-summary/week-summary.component';
import { ConflictResolutionDialogComponent } from '../shared/conflict-resolution-dialog/conflict-resolution-dialog.component';
import { CalendarEvent, DaySchedule, MonthDay } from '../mock-data';
import { DataStoreService } from '../core/services/data-store.service';
import { ConflictCheckResult, ConflictMove, PlannedSession, Workout } from '../core/models/app-data.models';
import { ConflictDetectorService } from '../core/services/conflict-detector.service';
import { SchedulerApiService } from '../core/services/scheduler-api.service';
import { cycleTrackingEnabled } from '../shared/state/cycle-ui.state';
import { calculatePhasesForWeek, PhaseName } from '../core/utils/cycle-phase.util';
import { environment } from '../../environments/environment';

const PHASE_COLORS: Partial<Record<PhaseName, string>> = {
  menstrual: '#A85454',
  follicular: '#2d4d7a',
  ovulation: '#C4923A',
  luteal: '#6B7F5E',
};

interface SchedulerGenerateResponse {
  placedEvents: Array<Partial<CalendarEvent> & { day: number }>;
  unplacedWorkouts: unknown[];
}

@Component({
  selector: 'app-week-page',
  imports: [
    ViewToggleComponent,
    RouterLink,
    WeekSummaryComponent,
    DayRowComponent,
    MonthGridComponent,
    ShareMonthComponent,
    QuickAddFabComponent,
    ConflictResolutionDialogComponent,
  ],
  templateUrl: './week.page.html',
  styleUrl: './week.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeekPageComponent {
  private readonly dataStore = inject(DataStoreService);
  private readonly conflictDetector = inject(ConflictDetectorService);
  private readonly schedulerApi = inject(SchedulerApiService);
  private readonly document = inject(DOCUMENT);
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly viewMode = signal<WeekViewMode>('week');
  protected readonly expandedEventId = signal<string | null>(null);
  protected readonly currentDate = signal(new Date());
  protected readonly isGenerating = signal(false);
  protected readonly schedulingSessionId = signal<string | null>(null);

  protected readonly conflictDialogOpen = signal(false);
  protected readonly pendingConflict = signal<ConflictCheckResult | null>(null);
  protected readonly pendingEventTitle = signal('');
  private pendingAction: (() => Promise<void>) | null = null;

  protected readonly weekStartDate = computed(() => this.startOfWeek(this.currentDate()));
  protected readonly isCurrentWeek = computed(() => this.isSameDate(this.weekStartDate(), this.startOfWeek(new Date())));
  protected readonly isCurrentMonth = computed(() => {
    const shownMonth = this.firstOfMonth(this.currentDate());
    const thisMonth = this.firstOfMonth(new Date());
    return shownMonth.getFullYear() === thisMonth.getFullYear() && shownMonth.getMonth() === thisMonth.getMonth();
  });

  protected readonly weekRangeLabel = computed(() => {
    const start = this.weekStartDate();
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const startMonth = new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(start);
    const endMonth = new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(end);
    const year = end.getFullYear();

    if (startMonth === endMonth) {
      return `${start.getDate()}-${end.getDate()} ${startMonth} ${year}`;
    }

    return `${start.getDate()} ${startMonth}-${end.getDate()} ${endMonth} ${year}`;
  });

  protected readonly monthLabel = computed(() =>
    new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(this.firstOfMonth(this.currentDate())),
  );

  protected readonly monthDays = computed<MonthDay[]>(() => this.buildMonthDays(this.currentDate()));

  protected readonly weekStartDateString = computed(() => this.toDateString(this.weekStartDate()));
  protected readonly currentPlan = computed(() => this.dataStore.currentPlan());

  protected readonly displayedWeekMeta = computed(() => this.resolveWeekMeta(this.weekStartDateString()));

  protected readonly displayedPhase = computed(() => this.displayedWeekMeta()?.phase ?? 'base');

  protected readonly displayedWeekNumber = computed(() => this.displayedWeekMeta()?.weekNumber ?? 1);

  protected readonly displayedWeekSessions = computed(() => {
    const weekNumber = this.displayedWeekMeta()?.weekNumber;
    if (!weekNumber) {
      return [];
    }

    return this.dataStore.currentPlan()?.weeks?.find((week) => week.weekNumber === weekNumber)?.sessions ?? [];
  });

  protected readonly unplacedCount = computed(
    () =>
      this.displayedWeekSessions().filter(
        (session) => session.status === 'pending' && !session.linkedCalendarEventId,
      ).length,
  );

  protected readonly unplacedSessions = computed(() =>
    this.displayedWeekSessions().filter(
      (session) => session.status === 'pending' && !session.linkedCalendarEventId,
    ),
  );

  protected readonly linkedSessionsByEventId = computed(() => {
    const linkedSessions = this.displayedWeekSessions().filter((session) => !!session.linkedCalendarEventId);
    return new Map(linkedSessions.map((session) => [session.linkedCalendarEventId as string, session]));
  });

  protected readonly weekEvents = computed(() => {
    const linkedSessions = this.linkedSessionsByEventId();

    return this.dataStore.eventsForWeek(this.weekStartDateString()).map((event) => {
      if (event.type !== 'workout') {
        return event;
      }

      const linkedSession = linkedSessions.get(event.id);
      if (!linkedSession) {
        return event;
      }

      return {
        ...event,
        status: linkedSession.status,
        intensity: linkedSession.intensity,
        priority: linkedSession.priority,
        duration: linkedSession.duration,
        distanceTarget: linkedSession.distanceTarget ?? event.distanceTarget,
        sessionType: linkedSession.sessionType,
        energyRating: linkedSession.energyRating ?? event.energyRating,
      };
    });
  });

  protected readonly conflictingEventIds = computed<Set<string>>(() => {
    const events = this.weekEvents();
    const result = new Set<string>();
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const a = events[i];
        const b = events[j];
        if (this.resolveEventDate(a) !== this.resolveEventDate(b)) continue;
        const aStart = this.timeToMin(a.startTime);
        const aEnd = this.timeToMin(a.endTime);
        const bStart = this.timeToMin(b.startTime);
        const bEnd = this.timeToMin(b.endTime);
        if (aStart < bEnd && aEnd > bStart) {
          result.add(a.id);
          result.add(b.id);
        }
      }
    }
    return result;
  });

  protected readonly weekSchedule = computed<DaySchedule[]>(() => {
    const start = this.weekStartDate();
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return labels.map((label, dayIndex) => {
      const date = new Date(start);
      date.setDate(start.getDate() + dayIndex);
      const dateString = this.toDateString(date);
      const events = this.weekEvents().filter((event) => this.resolveEventDate(event) === dateString);

      return {
        date: dateString,
        dayLabel: label,
        dayNumber: date.getDate(),
        isToday: this.isSameDate(date, new Date()),
        events,
      };
    });
  });

  protected readonly plannedWorkouts = computed(() => this.displayedWeekSessions().length);

  protected readonly completedWorkouts = computed(
    () => this.displayedWeekSessions().filter((session) => session.status === 'completed').length,
  );

  protected readonly hasWeekEvents = computed(() => this.weekEvents().length > 0);

  protected readonly showCyclePhases = signal(false);

  protected readonly showCyclePhasesToggle = computed(
    () => cycleTrackingEnabled() && this.dataStore.cycleProfile()?.mode === 'natural',
  );

  protected readonly phaseDotMap = computed<Map<string, string>>(() => {
    if (!this.showCyclePhases()) return new Map();
    const profile = this.dataStore.cycleProfile();
    if (!profile) return new Map();
    const phases = calculatePhasesForWeek(profile, this.weekStartDateString());
    const result = new Map<string, string>();
    phases.forEach((phase, date) => {
      const color = PHASE_COLORS[phase];
      if (color) result.set(date, color);
    });
    return result;
  });

  constructor() {
    void this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.load();

    if (this.route.snapshot.queryParamMap.get('schedule') === '1') {
      await this.scheduleWeek();
      await this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { schedule: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  private async load(): Promise<void> {
    await this.dataStore.loadAll();
  }

  protected setViewMode(mode: WeekViewMode): void {
    if (mode === this.viewMode()) {
      this.currentDate.set(new Date());
      return;
    }

    if (mode === 'month') {
      const weekCenter = new Date(this.weekStartDate());
      weekCenter.setDate(weekCenter.getDate() + 3);
      this.currentDate.set(weekCenter);
    } else {
      const firstOfCurrentMonth = this.firstOfMonth(this.currentDate());
      this.currentDate.set(this.startOfWeek(firstOfCurrentMonth));
    }

    this.viewMode.set(mode);
  }

  protected previousWeek(): void {
    this.shiftWeek(-7);
  }

  protected nextWeek(): void {
    this.shiftWeek(7);
  }

  protected previousMonth(): void {
    this.shiftMonth(-1);
  }

  protected nextMonth(): void {
    this.shiftMonth(1);
  }

  protected jumpToCurrentWeek(): void {
    this.currentDate.set(new Date());
  }

  protected jumpToCurrentMonth(): void {
    this.currentDate.set(new Date());
  }

  protected async scheduleWeek(): Promise<void> {
    if (this.isGenerating()) {
      return;
    }

    this.isGenerating.set(true);

    try {
      const existingEvents = this.weekEvents()
        .filter((event) => event.type === 'shift' || event.type === 'custom-event' || event.type === 'personal')
        .map((event) => this.toSchedulerEvent(event));
      const workouts = this.resolveSchedulerWorkouts();
      const schedulerSettings = this.dataStore.schedulerSettings();
      const mealprepSettings = this.dataStore.mealprepSettings();

      const payload = {
        existingEvents,
        workouts,
        mealPrep: {
          duration: mealprepSettings?.duration ?? 90,
          sessionsPerWeek: mealprepSettings?.sessionsPerWeek ?? 2,
        },
        settings: schedulerSettings
          ? {
              commuteMinutes: 0,
              autoPlaceEarliestTime: '06:00',
              autoPlaceLatestTime: '22:00',
              enduranceWeight: schedulerSettings.enduranceWeight,
              strengthWeight: schedulerSettings.strengthWeight,
              yogaWeight: schedulerSettings.yogaWeight,
              enduranceThresholds: {
                running: { durationMin: schedulerSettings.enduranceWorkoutMinDuration, distanceKm: 15 },
                biking: { durationMin: Math.max(90, schedulerSettings.enduranceWorkoutMinDuration), distanceKm: 40 },
                swimming: { durationMin: schedulerSettings.enduranceWorkoutMinDuration, distanceKm: 3 },
              },
              enduranceRestDays: 1,
              priorityHierarchy: ['sport', 'recovery', 'mealprep'],
            }
          : undefined,
      };

      const response = await firstValueFrom(
        this.http.post<SchedulerGenerateResponse>(`${environment.apiBaseUrl}/scheduler/generate`, payload),
      );

      const workoutLimit = workouts.length;
      const workoutPlaced = response.placedEvents.filter((event) => (event.type ?? 'workout') === 'workout').length;
      if (workoutPlaced > workoutLimit) {
        console.warn(
          `[WeekPlanner] Scheduler generated ${workoutPlaced} workouts for ${workoutLimit} planned sessions. Ignoring extras.`,
        );
      }

      let remainingWorkoutSlots = workoutLimit;
      const filteredPlacedEvents = response.placedEvents.filter((event) => {
        const type = event.type ?? 'workout';
        if (type !== 'workout') {
          return true;
        }

        if (remainingWorkoutSlots <= 0) {
          return false;
        }

        remainingWorkoutSlots -= 1;
        return true;
      });

      for (const event of filteredPlacedEvents) {
        const date = new Date(this.weekStartDate());
        date.setDate(date.getDate() + (event.day ?? 0));

        await this.dataStore.addCalendarEvent({
          ...event,
          date: this.toDateString(date),
          day: event.day ?? 0,
          type: event.type ?? 'workout',
        });
      }
    } catch (error) {
      console.error('[WeekPlanner] Failed to generate schedule', error);
    } finally {
      this.isGenerating.set(false);
    }
  }

  protected toggleExpandedEvent(eventId: string): void {
    this.expandedEventId.update((currentEventId) => (currentEventId === eventId ? null : eventId));
  }

  protected async onEventUpdated(event: CalendarEvent): Promise<void> {
    const linkedSession = event.type === 'workout'
      ? this.linkedSessionsByEventId().get(event.id) ?? this.dataStore.findPlannedSessionByEventId(event.id)
      : null;

    if (event.type === 'workout' && event.status === 'completed' && linkedSession) {
      const updated = await this.dataStore.completeSession(linkedSession.id, event.energyRating ?? 'moderate');
      return;
    }

    // For non-workout events (shifts, personal, mealprep), check if the change
    // causes conflicts with scheduled workouts before saving.
    if (event.type !== 'workout' && event.date) {
      const result = await this.conflictDetector.check(
        { date: event.date, startTime: event.startTime, endTime: event.endTime, type: event.type, commuteMinutes: event.commuteMinutes },
        event.id,
      );
      if (result?.hasConflicts) {
        this.pendingConflict.set(result);
        this.pendingEventTitle.set(event.title);
        this.pendingAction = async () => {
          await this.dataStore.updateCalendarEvent(event.id, event);
        };
        this.conflictDialogOpen.set(true);
        return;
      }
    }

    await this.dataStore.updateCalendarEvent(event.id, event);
  }

  protected scrollToFirstWorkout(): void {
    const firstWorkout = this.document.querySelector('.rows-wrap .event-pill') as HTMLElement | null;
    firstWorkout?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  protected openPlanTab(): void {
    void this.router.navigate(['/plan']);
  }

  protected async scheduleUnplacedSession(sessionId: string): Promise<void> {
    this.schedulingSessionId.set(sessionId);

    try {
      await this.dataStore.scheduleSession(sessionId);
    } finally {
      this.schedulingSessionId.set(null);
    }
  }

  protected async onEventDeleted(id: string): Promise<void> {
    await this.dataStore.deleteCalendarEvent(id);
  }

  protected async onQuickAddEvent(events: Partial<CalendarEvent>[]): Promise<void> {
    // Only check single non-repeating events — repeating shifts span the whole week
    const first = events[0];
    if (events.length === 1 && first?.date && !first.isRepeatingWeekly) {
      const result = await this.conflictDetector.check({
        date: first.date,
        startTime: first.startTime ?? '00:00',
        endTime: first.endTime ?? '00:00',
        type: first.type ?? 'custom-event',
        commuteMinutes: first.commuteMinutes,
      });
      if (result?.hasConflicts) {
        this.pendingConflict.set(result);
        this.pendingEventTitle.set(first.title ?? 'New event');
        this.pendingAction = async () => {
          for (const event of events) {
            await this.dataStore.addCalendarEvent(event);
          }
        };
        this.conflictDialogOpen.set(true);
        return;
      }
    }
    for (const event of events) {
      await this.dataStore.addCalendarEvent(event);
    }
  }

  protected async onConflictApply(moves: ConflictMove[]): Promise<void> {
    this.conflictDialogOpen.set(false);
    if (moves.length > 0) {
      try {
        await firstValueFrom(this.schedulerApi.applyConflicts(moves));
      } catch {
        // non-fatal — proceed with saving the new event
      }
    }
    await this.pendingAction?.();
    this.pendingAction = null;
    this.pendingConflict.set(null);
    await this.dataStore.loadAll();
  }

  protected async onConflictKeep(): Promise<void> {
    this.conflictDialogOpen.set(false);
    await this.pendingAction?.();
    this.pendingAction = null;
    this.pendingConflict.set(null);
  }

  protected onConflictCancel(): void {
    this.conflictDialogOpen.set(false);
    this.pendingAction = null;
    this.pendingConflict.set(null);
  }

  private shiftWeek(days: number): void {
    const next = new Date(this.currentDate());
    next.setDate(next.getDate() + days);
    this.currentDate.set(next);
  }

  private shiftMonth(months: number): void {
    const next = new Date(this.currentDate());
    next.setDate(1);
    next.setMonth(next.getMonth() + months);
    this.currentDate.set(next);
  }

  private toSchedulerEvent(event: CalendarEvent): CalendarEvent {
    const mappedType = event.type === 'personal' ? 'custom-event' : event.type;
    return {
      ...event,
      type: mappedType,
      durationMinutes: event.durationMinutes ?? event.duration,
      distanceKm: event.distanceKm ?? event.distanceTarget,
      isPersonal: event.type === 'custom-event' || event.type === 'personal' || event.isPersonal,
    };
  }

  private resolveSchedulerWorkouts(): Workout[] {
    const currentPlan = this.dataStore.currentPlan();
    if (!currentPlan) {
      return this.dataStore.workouts();
    }

    const eligibleSessions = this.dataStore
      .currentWeekSessions()
      .filter((session) => session.status === 'pending' || session.status === 'scheduled');

    return eligibleSessions.map((session) => ({
      id: session.id,
      name: this.formatSessionName(session.sessionType),
      workoutType: this.mapSessionTypeToWorkoutType(session.sessionType),
      duration: session.duration,
      frequencyPerWeek: 1,
      priority: session.priority,
      distanceKm: session.distanceTarget ?? undefined,
    }));
  }

  private formatSessionName(sessionType: string): string {
    const normalized = sessionType.toLowerCase();
    const labelMap: Record<string, string> = {
      easy_run: 'Easy Run',
      long_run: 'Long Run',
      tempo: 'Tempo Run',
      intervals: 'Intervals',
      hill_reps: 'Hill Reps',
      cardio_run: 'Cardio Run',
      strength: 'Strength Training',
      hiit: 'HIIT',
      yoga: 'Yoga',
      mobility: 'Mobility',
      swim: 'Swim',
      bike: 'Bike',
    };

    return labelMap[normalized] ?? normalized.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private mapSessionTypeToWorkoutType(sessionType: string): Workout['workoutType'] {
    const normalized = sessionType.toLowerCase();
    if (
      normalized === 'easy_run' ||
      normalized === 'long_run' ||
      normalized === 'tempo' ||
      normalized === 'intervals' ||
      normalized === 'hill_reps' ||
      normalized === 'cardio_run'
    ) {
      return 'running';
    }

    if (normalized === 'strength' || normalized === 'hiit') {
      return 'strength';
    }

    if (normalized === 'yoga' || normalized === 'mobility') {
      return 'yoga';
    }

    if (normalized === 'swim') {
      return 'swimming';
    }

    if (normalized === 'bike') {
      return 'biking';
    }

    return 'strength';
  }

  private timeToMin(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  }

  private resolveEventDate(event: CalendarEvent): string {
    if (event.date) {
      return event.date;
    }

    const derived = new Date(this.weekStartDate());
    derived.setDate(derived.getDate() + (event.day ?? 0));
    return this.toDateString(derived);
  }

  private startOfWeek(date: Date): Date {
    const copy = new Date(date);
    const day = copy.getDay();
    const diff = (day + 6) % 7;
    copy.setDate(copy.getDate() - diff);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  private firstOfMonth(date: Date): Date {
    const copy = new Date(date);
    copy.setDate(1);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  private buildMonthDays(anchorDate: Date): MonthDay[] {
    const monthStart = this.firstOfMonth(anchorDate);
    const gridStart = this.startOfWeek(monthStart);
    const targetMonth = monthStart.getMonth();
    const today = new Date();

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      const dateKey = this.toDateString(date);
      const dayEvents = this.dataStore.eventsForDay(dateKey);

      const shiftEvent = dayEvents.find((event) => event.type === 'shift');
      const workoutCount = dayEvents.filter((event) => event.type === 'workout').length;
      const hasMealPrep = dayEvents.some((event) => event.type === 'mealprep');
      const hasPersonal = dayEvents.some((event) => event.type === 'custom-event' || event.type === 'personal');

      return {
        date: dateKey,
        dayNumber: date.getDate(),
        isCurrentMonth: date.getMonth() === targetMonth,
        isToday: this.isSameDate(date, today),
        indicators: {
          hasShift: !!shiftEvent,
          hasWorkout: workoutCount > 0,
          hasMealPrep,
          hasPersonal,
          isFreeDay: dayEvents.length === 0,
        },
        shiftLabel: shiftEvent ? this.shiftLabel(shiftEvent.title) : undefined,
        workoutCount,
      };
    });
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

  private shiftLabel(title: string): string {
    if (!title) {
      return 'Shift';
    }

    const normalized = title.toLowerCase();
    if (normalized.includes('morning')) {
      return 'Morning';
    }
    if (normalized.includes('early')) {
      return 'Early';
    }
    if (normalized.includes('late')) {
      return 'Late';
    }
    if (normalized.includes('night')) {
      return 'Night';
    }

    return 'Shift';
  }

  private isSameDate(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  private toDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private sessionDateLabel(session: PlannedSession): string | null {
    const linkedEventId = session.linkedCalendarEventId;
    if (!linkedEventId) {
      return null;
    }

    const event = this.weekEvents().find((candidate) => candidate.id === linkedEventId);
    return event?.date ?? null;
  }
}
