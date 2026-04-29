import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CreatePlanCtaComponent } from '../features/plan/create-plan-cta/create-plan-cta.component';
import { CurrentWeekCardComponent } from '../features/plan/current-week-card/current-week-card.component';
import { PlanHeaderComponent } from '../features/plan/plan-header/plan-header.component';
import { PlanWeekTimelineComponent } from '../features/plan/plan-week-timeline/plan-week-timeline.component';
import { QuickPlanSwitchComponent } from '../features/plan/quick-plan-switch/quick-plan-switch.component';
import { RaceDayPlanComponent } from '../features/race-day-plan/race-day-plan.component';
import { DataStoreService } from '../core/services/data-store.service';
import { PlannedSession, PlanWeekSummary, ScheduleEntirePlanResult } from '../core/models/app-data.models';

@Component({
  selector: 'app-plan-page',
  imports: [
    RouterLink,
    PlanHeaderComponent,
    CurrentWeekCardComponent,
    PlanWeekTimelineComponent,
    QuickPlanSwitchComponent,
    CreatePlanCtaComponent,
    RaceDayPlanComponent,
  ],
  templateUrl: './plan.page.html',
  styleUrl: './plan.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanPageComponent {
  private readonly dataStore = inject(DataStoreService);
  private readonly router = inject(Router);

  protected readonly hasPlan = computed(() => !!this.dataStore.currentPlan());
  protected readonly hasSavedSettings = computed(() => this.dataStore.schedulerSettings() !== null);
  protected readonly showCreatePlanCta = computed(
    () => !this.hasPlan() && (!this.hasSavedSettings() || !this.quickSwitchOpen()),
  );
  protected readonly expandedTimelineWeekNumber = signal<number | null>(null);
  protected readonly currentWeekCollapseToken = signal(0);
  protected readonly expandedWeekSessions = signal<Record<number, PlannedSession[]>>({});
  protected readonly isRegenerating = signal(false);
  protected readonly isDeleting = signal(false);
  protected readonly isSchedulingAllWeeks = signal(false);
  protected readonly scheduleAllSummary = signal<string | null>(null);
  protected readonly quickSwitchOpen = signal(false);

  protected readonly plan = computed(() => this.dataStore.currentPlan());
  protected readonly todayWeekNumber = computed(() => this.resolveTodayWeekNumber());
  protected readonly allWeeks = computed<PlanWeekSummary[]>(() => {
    const plan = this.dataStore.currentPlan();
    const weeks = this.dataStore.planWeeks();
    const expandedSessionsMap = this.expandedWeekSessions();
    const currentWeekSessions = this.dataStore.currentWeekSessions();
    const todayWeekNumber = this.todayWeekNumber();

    if (!plan) {
      return [];
    }

    if (weeks.length === 0) {
      return [
        {
          weekNumber: plan.currentWeek || 1,
          phase: 'base',
          isDeload: false,
          isCurrentWeek: true,
          startDate: this.todayDateString(),
          sessions: currentWeekSessions.map((session) => this.toSessionSummary(session, this.todayDateString())),
          completedSessions: currentWeekSessions.filter((session) => session.status === 'completed').length,
          totalSessions: currentWeekSessions.length,
        },
      ];
    }

    return weeks
      .slice()
      .sort((a, b) => a.weekNumber - b.weekNumber)
      .map((week) => {
        const planWeekSessions = plan.weeks?.find((w) => w.weekNumber === week.weekNumber)?.sessions;
        const resolvedSessions = week.weekNumber === todayWeekNumber
          ? currentWeekSessions
          : expandedSessionsMap[week.weekNumber] ?? planWeekSessions ?? [];
        const summaries = resolvedSessions.map((session) => this.toSessionSummary(session, week.startDate));

        return {
          weekNumber: week.weekNumber,
          phase: week.phase,
          isDeload: week.isDeload,
          isCurrentWeek: week.weekNumber === todayWeekNumber,
          startDate: week.startDate,
          sessions: summaries,
          completedSessions: summaries.filter((session) => session.status === 'completed').length,
          totalSessions: summaries.length,
        };
      });
  });

  protected readonly currentWeek = computed(() => {
    const weeks = this.allWeeks();
    const todayWeekNumber = this.todayWeekNumber();
    return weeks.find((w) => w.weekNumber === todayWeekNumber) ?? weeks[0] ?? null;
  });

  protected readonly hasScheduledSessions = computed(() =>
    this.allWeeks().some((week) =>
      week.sessions.some(
        (session) =>
          session.status === 'scheduled' ||
          session.status === 'completed' ||
          session.status === 'skipped' ||
          session.status === 'moved',
      ),
    ),
  );

  protected readonly showPlanCreatedHint = computed(() => {
    const hasPlan = !!this.dataStore.currentPlan();
    return hasPlan && this.dataStore.planWeeks().length === 0 && this.dataStore.currentWeekSessions().length === 0;
  });

  protected readonly showRaceDayPlanSection = computed(() => {
    const plan = this.plan();
    const sportType = plan?.sportType?.toLowerCase() ?? '';
    return !!plan && sportType.includes('triathlon') && !!plan.goalDate;
  });

  protected readonly isRaceDayPlanWindowOpen = computed(() => {
    const plan = this.plan();
    if (!plan?.goalDate) {
      return false;
    }

    const daysUntilRace = this.daysUntilDate(plan.goalDate);
    return daysUntilRace !== null && daysUntilRace <= 14;
  });

  constructor() {
    void this.dataStore.loadAll();

    effect(() => {
      if (!this.dataStore.currentPlan()) {
        this.expandedWeekSessions.set({});
      }
    });
  }

  protected onCurrentWeekSessionToggle(): void {
    this.expandedTimelineWeekNumber.set(null);
  }

  protected async onTimelineWeekToggle(weekNumber: number): Promise<void> {
    this.expandedTimelineWeekNumber.update((current) => current === weekNumber ? null : weekNumber);
    this.currentWeekCollapseToken.update((value) => value + 1);

    const expandedWeek = this.expandedTimelineWeekNumber();
    const plan = this.dataStore.currentPlan();
    if (!plan || expandedWeek !== weekNumber) {
      return;
    }

    const hasPersistedWeek = this.dataStore.planWeeks().some((week) => week.weekNumber === weekNumber);
    if (!hasPersistedWeek) {
      this.expandedWeekSessions.update((map) => ({
        ...map,
        [weekNumber]: [],
      }));
      return;
    }

    const sessions = await this.dataStore.loadWeekSessions(plan.id, weekNumber);
    this.expandedWeekSessions.update((map) => ({
      ...map,
      [weekNumber]: sessions,
    }));
  }

  protected async markSessionDone(sessionId: string, energyRating: 'easy' | 'moderate' | 'hard'): Promise<void> {
    await this.dataStore.completeSession(sessionId, energyRating);
  }

  protected async skipSession(sessionId: string): Promise<void> {
    await this.dataStore.skipSession(sessionId);
  }

  protected onSessionStartRequested(eventId: string): void {
    void this.router.navigate(['/workout', eventId]);
  }

  protected async scheduleRemainingSessions(): Promise<void> {
    await this.router.navigate(['/week'], { queryParams: { schedule: '1' } });
  }

  protected async changeGoal(): Promise<void> {
    if (!this.dataStore.currentPlan()) {
      if (this.hasSavedSettings()) {
        this.quickSwitchOpen.set(true);
        return;
      }

      await this.router.navigate(['/onboarding']);
      return;
    }

    this.quickSwitchOpen.set(true);
  }

  protected openQuickPlanSwitch(): void {
    this.quickSwitchOpen.set(true);
  }

  protected closeQuickPlanSwitch(): void {
    this.quickSwitchOpen.set(false);
  }

  protected async onQuickPlanSwitched(): Promise<void> {
    this.quickSwitchOpen.set(false);
    this.expandedWeekSessions.set({});
    this.expandedTimelineWeekNumber.set(null);
    await this.dataStore.loadAll();
  }

  protected async scheduleEntirePlan(): Promise<void> {
    const plan = this.dataStore.currentPlan();
    if (!plan || this.isSchedulingAllWeeks()) {
      return;
    }

    this.isSchedulingAllWeeks.set(true);
    this.scheduleAllSummary.set(null);

    try {
      const result = await this.dataStore.scheduleEntirePlan(plan.id);
      this.expandedWeekSessions.set({});
      this.expandedTimelineWeekNumber.set(null);
      this.scheduleAllSummary.set(this.formatScheduleAllSummary(result));
    } catch {
      this.scheduleAllSummary.set('Could not schedule the full plan.');
    } finally {
      this.isSchedulingAllWeeks.set(false);
    }
  }

  protected async regeneratePlanSessions(): Promise<void> {
    const plan = this.dataStore.currentPlan();
    if (!plan || this.isRegenerating()) {
      return;
    }

    this.isRegenerating.set(true);
    try {
      await this.dataStore.generatePlanTemplate(plan.id);
      this.expandedWeekSessions.set({});
      this.expandedTimelineWeekNumber.set(null);
    } finally {
      this.isRegenerating.set(false);
    }
  }

  protected async deletePlan(): Promise<void> {
    const plan = this.dataStore.currentPlan();
    if (!plan || this.isDeleting()) {
      return;
    }

    this.isDeleting.set(true);
    try {
      await this.dataStore.deletePlan(plan.id);
      this.expandedWeekSessions.set({});
      this.expandedTimelineWeekNumber.set(null);
      this.currentWeekCollapseToken.update((value) => value + 1);
      this.quickSwitchOpen.set(this.hasSavedSettings());
    } finally {
      this.isDeleting.set(false);
    }
  }

  private toSessionSummary(session: PlannedSession, weekStartDate: string): PlanWeekSummary['sessions'][number] {
    const scheduledDateLabel = this.resolveSessionScheduledDateLabel(session, weekStartDate);
    const carryForwardLabel = this.buildCarryForwardLabel(session, scheduledDateLabel);

    return {
      id: session.id,
      sessionType: session.sessionType,
      priority: session.priority,
      duration: session.duration,
      intensity: session.intensity,
      distanceTarget: session.distanceTarget ?? undefined,
      status: session.status,
      isCarryForward: session.isCarryForward,
      originalWeekNumber: session.originalWeekNumber,
      linkedCalendarEventId: session.linkedCalendarEventId,
      scheduledDateLabel,
      carryForwardLabel,
    };
  }

  private todayDateString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatScheduleAllSummary(result: ScheduleEntirePlanResult): string {
    const unplacedCount = result.unplacedSessions.length;
    const weekLabel = result.scheduledWeeks === 1 ? 'week' : 'weeks';
    const workoutLabel = result.totalEventsPlaced === 1 ? 'workout' : 'workouts';
    const unplacedLabel = unplacedCount === 1 ? 'unplaced' : 'unplaced';
    return `${result.scheduledWeeks} ${weekLabel} scheduled, ${result.totalEventsPlaced} ${workoutLabel} placed, ${unplacedCount} ${unplacedLabel}`;
  }

  private resolveTodayWeekNumber(): number {
    const plan = this.dataStore.currentPlan();
    const weeks = this.dataStore.planWeeks();

    if (!plan || weeks.length === 0) {
      return 1;
    }

    const today = this.todayDateString();
    const matchingWeek = weeks.find((week) => today >= week.startDate && today <= week.endDate);
    return matchingWeek?.weekNumber ?? plan.currentWeek ?? 1;
  }

  private buildCarryForwardLabel(session: PlannedSession, scheduledDateLabel?: string): string | undefined {
    if (!session.isCarryForward || !session.originalWeekNumber) {
      return undefined;
    }

    if (!scheduledDateLabel) {
      return `Carried from Week ${session.originalWeekNumber}`;
    }

    return `Carried from Week ${session.originalWeekNumber} · ${scheduledDateLabel}`;
  }

  private resolveSessionScheduledDateLabel(session: PlannedSession, weekStartDate: string): string | undefined {
    if (!session.linkedCalendarEventId) {
      return undefined;
    }

    const event = this.dataStore
      .calendarEvents()
      .find((candidate) => candidate.id === session.linkedCalendarEventId);

    if (!event) {
      return undefined;
    }

    const eventDate = event.date
      ? new Date(`${event.date}T00:00:00`)
      : this.dateFromWeekStartAndDay(weekStartDate, event.day);

    if (!eventDate) {
      return undefined;
    }

    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(eventDate);
  }

  private dateFromWeekStartAndDay(weekStartDate: string, day: number | undefined): Date | null {
    if (typeof day !== 'number') {
      return null;
    }

    const start = new Date(`${weekStartDate}T00:00:00`);
    start.setDate(start.getDate() + day);
    return start;
  }

  private daysUntilDate(value: string): number | null {
    const target = new Date(`${value}T00:00:00`);
    if (Number.isNaN(target.getTime())) {
      return null;
    }

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.ceil((target.getTime() - todayStart.getTime()) / msPerDay);
  }
}
