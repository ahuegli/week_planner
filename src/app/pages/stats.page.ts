import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe, TitleCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  CalendarEvent,
  PlannedSession,
  SportStats,
  StatsSummary,
  StreakStats,
  WeeklyStats,
  WorkoutLog,
} from '../core/models/app-data.models';
import { StatsApiService } from '../core/services/stats-api.service';
import { DataStoreService } from '../core/services/data-store.service';
import { MiniBarChartComponent, ChartBar } from '../features/stats/components/mini-bar-chart.component';
import { calculateBadges, Badge } from '../features/stats/utils/badge-calculator';
import { calculateTaskBadges } from '../features/stats/utils/task-badge-calculator';

const RING_R = 36;
export const RING_C = +(2 * Math.PI * RING_R).toFixed(2);
type StatsPeriod = 'this-week' | 'all-time';
type RecentCompletionSource = 'planned' | 'logged';
type RecentActivityType = 'running' | 'biking' | 'swimming' | 'strength' | 'mobility' | 'other';

interface PeriodStatsView {
  label: 'This week' | 'All time';
  completed: number;
  total: number;
  keyCompleted: number;
  keyTotal: number;
  completionRate: number;
  keyCompletionRate: number;
  supportingCompletionRate: number | null;
  optionalCompletionRate: number | null;
  totalWorkoutsCompleted: number;
  totalDurationMinutes: number;
  totalDistanceKm: number;
}

interface RecentCompletionItem {
  id: string;
  source: RecentCompletionSource;
  title: string;
  completedAt: Date;
  completedAtLabel: string;
  dateKey: string;
  activityType: RecentActivityType;
  durationMinutes: number | null;
  distanceKm: number | null;
}

const MOTIVATIONAL: Array<(s: StatsSummary, st: StreakStats) => string | null> = [
  (s, st) => st.currentWeekStreak >= 4 ? `You're on fire! ${st.currentWeekStreak} weeks of crushing it.` : null,
  (s, st) => st.currentWeekStreak >= 2 ? `${st.currentWeekStreak}-week streak — consistency is your superpower.` : null,
  (s) => s.completionRate >= 85 ? `${s.completionRate}% completion rate — your consistency is what builds fitness.` : null,
  (s) => s.totalDistanceKm > 0 && s.totalDistanceKm < 100
    ? `Just ${Math.round(100 - s.totalDistanceKm)} km until you hit the century. Keep going.`
    : null,
  (s) => s.completionRate >= 70 && s.completionRate < 85
    ? `${s.completionRate}% completion — solid foundation. Push for 85%.`
    : null,
  () => `Every session builds the athlete you're becoming.`,
];

@Component({
  selector: 'app-stats-page',
  standalone: true,
  imports: [MiniBarChartComponent, DecimalPipe, TitleCasePipe],
  templateUrl: './stats.page.html',
  styleUrl: './stats.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsPageComponent {
  private readonly statsApi = inject(StatsApiService);
  private readonly dataStore = inject(DataStoreService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly summary = signal<StatsSummary | null>(null);
  protected readonly weekly = signal<WeeklyStats | null>(null);
  protected readonly streaks = signal<StreakStats | null>(null);
  protected readonly sportStats = signal<SportStats[]>([]);
  protected readonly summaryError = signal(false);
  protected readonly weeklyError = signal(false);
  protected readonly streaksError = signal(false);
  protected readonly volumeMetric = signal<'duration' | 'distance'>('duration');
  protected readonly selectedPeriod = signal<StatsPeriod>('this-week');
  protected readonly expandedSport = signal<string | null>(null);
  protected readonly expandedBadgeId = signal<string | null>(null);

  protected readonly ringCircumference = RING_C;

  private readonly thisWeekStats = computed<PeriodStatsView | null>(() => {
    const s = this.summary();
    if (!s) return null;

    const weeks = this.weekly()?.weeks ?? [];
    const currentWeekNumber = s.currentPlan?.weekNumber;
    const matchingWeek = currentWeekNumber
      ? weeks.find(w => w.weekNumber === currentWeekNumber)
      : weeks.at(-1);

    const completionRate = s.thisWeek.total > 0
      ? Math.round((s.thisWeek.completed / s.thisWeek.total) * 100)
      : 0;
    const keyCompletionRate = s.thisWeek.keySessionsTotal > 0
      ? Math.round((s.thisWeek.keySessionsHit / s.thisWeek.keySessionsTotal) * 100)
      : 0;

    return {
      label: 'This week',
      completed: s.thisWeek.completed,
      total: s.thisWeek.total,
      keyCompleted: s.thisWeek.keySessionsHit,
      keyTotal: s.thisWeek.keySessionsTotal,
      completionRate,
      keyCompletionRate,
      supportingCompletionRate: null,
      optionalCompletionRate: null,
      totalWorkoutsCompleted: matchingWeek?.completed ?? s.thisWeek.completed,
      totalDurationMinutes: matchingWeek?.totalDurationMinutes ?? 0,
      totalDistanceKm: matchingWeek?.totalDistanceKm ?? 0,
    };
  });

  private readonly allTimeStats = computed<PeriodStatsView | null>(() => {
    const s = this.summary();
    if (!s) return null;

    return {
      label: 'All time',
      completed: s.totalWorkoutsCompleted,
      total: s.keyTotal + s.supportTotal + s.optTotal,
      keyCompleted: s.keyCompleted,
      keyTotal: s.keyTotal,
      completionRate: s.completionRate,
      keyCompletionRate: s.keyCompletionRate,
      supportingCompletionRate: s.supportingCompletionRate,
      optionalCompletionRate: s.optionalCompletionRate,
      totalWorkoutsCompleted: s.totalWorkoutsCompleted,
      totalDurationMinutes: s.totalDurationMinutes,
      totalDistanceKm: s.totalDistanceKm,
    };
  });

  protected readonly selectedStats = computed<PeriodStatsView | null>(() =>
    this.selectedPeriod() === 'this-week' ? this.thisWeekStats() : this.allTimeStats(),
  );

  protected readonly ringOffset = computed(() => {
    const selected = this.selectedStats();
    if (!selected || selected.total === 0) return RING_C;
    return +(RING_C * (1 - selected.completed / selected.total)).toFixed(2);
  });

  protected readonly weeklyChartData = computed<ChartBar[]>(() => {
    const weeks = this.weekly()?.weeks ?? [];
    const metric = this.volumeMetric();
    return weeks.map((w, i) => ({
      label: `W${w.weekNumber}`,
      value: metric === 'duration' ? w.totalDurationMinutes : w.totalDistanceKm,
      rate: w.total > 0 ? w.completed / w.total : 0,
      active: i === weeks.length - 1,
    }));
  });

  protected readonly badges = computed<Badge[]>(() =>
    calculateBadges(this.summary(), this.streaks(), this.sportStats()),
  );

  protected readonly taskBadges = computed<Badge[]>(() =>
    calculateTaskBadges(this.summary()),
  );

  private readonly allCompletedActivities = computed<RecentCompletionItem[]>(() => {
    const eventsById = new Map(this.dataStore.calendarEvents().map((event) => [event.id, event]));

    const offPlanLogs = this.dataStore
      .workoutLogs()
      .filter((log) => !log.plannedSessionId)
      .map((log) => this.toRecentFromWorkoutLog(log))
      .filter((item): item is RecentCompletionItem => item !== null);

    const completedPlanned = (this.dataStore.currentPlan()?.weeks ?? [])
      .flatMap((week) => week.sessions ?? [])
      .filter((session) => session.status === 'completed')
      .map((session) => this.toRecentFromPlannedSession(session, eventsById))
      .filter((item): item is RecentCompletionItem => item !== null);

    return [...offPlanLogs, ...completedPlanned].sort(
      (a, b) => b.completedAt.getTime() - a.completedAt.getTime(),
    );
  });

  protected readonly showRecentlyCompleted = computed(() => this.allCompletedActivities().length > 0);

  protected readonly recentCompletions = computed<RecentCompletionItem[]>(() => {
    let items = this.allCompletedActivities();

    if (this.selectedPeriod() === 'this-week') {
      items = items.filter((item) => this.isInCurrentIsoWeek(item.completedAt));
    }

    return items.slice(0, 5);
  });

  protected readonly showRecentEmptyState = computed(
    () => this.showRecentlyCompleted() && this.recentCompletions().length === 0,
  );

  protected readonly motivationalMessage = computed<string>(() => {
    const s = this.summary();
    const st = this.streaks();
    if (!s || !st) return '';
    for (const fn of MOTIVATIONAL) {
      const msg = fn(s, st);
      if (msg) return msg;
    }
    return '';
  });

  protected readonly activeSports = computed(() =>
    this.sportStats().filter(s => s.totalSessions > 0),
  );

  protected setPeriod(period: StatsPeriod): void {
    this.selectedPeriod.set(period);
  }

  constructor() {
    void this.loadAll();
  }

  private async loadAll(): Promise<void> {
    this.loading.set(true);

    const [summaryResult, weeklyResult, streaksResult, dataStoreResult] = await Promise.allSettled([
      firstValueFrom(this.statsApi.getSummary()),
      firstValueFrom(this.statsApi.getWeekly()),
      firstValueFrom(this.statsApi.getStreaks()),
      this.dataStore.loadAll(),
    ]);

    if (dataStoreResult.status === 'rejected') {
      console.error('[StatsPage] Failed to load activity data for recent completions', dataStoreResult.reason);
    }

    if (summaryResult.status === 'fulfilled') {
      this.summary.set(summaryResult.value);
    } else {
      this.summaryError.set(true);
    }

    if (weeklyResult.status === 'fulfilled') {
      this.weekly.set(weeklyResult.value);
    } else {
      this.weeklyError.set(true);
    }

    if (streaksResult.status === 'fulfilled') {
      this.streaks.set(streaksResult.value);
    } else {
      this.streaksError.set(true);
    }

    // Load sport stats based on what's in summary
    if (summaryResult.status === 'fulfilled') {
      const sportTypes = ['running', 'biking', 'swimming', 'strength', 'yoga'];
      const sportResults = await Promise.allSettled(
        sportTypes.map(s => firstValueFrom(this.statsApi.getSportStats(s))),
      );
      const sports = sportResults
        .filter((r): r is PromiseFulfilledResult<SportStats> => r.status === 'fulfilled')
        .map(r => r.value)
        .filter(s => s.totalSessions > 0);
      this.sportStats.set(sports);
    }

    this.loading.set(false);
  }

  protected goBack(): void {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      void this.router.navigate(['/today']);
    }
  }

  protected toggleSport(sport: string): void {
    this.expandedSport.update(v => (v === sport ? null : sport));
  }

  protected toggleBadge(id: string): void {
    this.expandedBadgeId.update(v => (v === id ? null : id));
  }

  protected formatSince(date: string | null): string {
    if (!date) return '';
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(
      new Date(`${date}T00:00:00`),
    );
  }

  protected formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  protected completionRateColor(rate: number, hasWorkouts?: boolean): string {
    const hasAnyWorkouts = hasWorkouts ?? ((this.summary()?.totalWorkoutsCompleted ?? 0) > 0);
    if (rate === 0 && !hasAnyWorkouts) return 'var(--color-text-secondary)';
    if (rate >= 80) return 'var(--color-success)';
    if (rate >= 60) return 'var(--color-warning)';
    return 'var(--color-error)';
  }

  protected sportLabel(type: string): string {
    const map: Record<string, string> = {
      running: 'Running', biking: 'Cycling', swimming: 'Swimming',
      strength: 'Strength', yoga: 'Yoga & Mobility',
    };
    return map[type] ?? type;
  }

  protected sportTrend(sport: SportStats): 'up' | 'down' | 'flat' {
    const weeks = sport.weeklyTrend;
    if (weeks.length < 8) return 'flat';
    const recent = weeks.slice(4).reduce((sum, w) => sum + w.distanceKm, 0);
    const prior = weeks.slice(0, 4).reduce((sum, w) => sum + w.distanceKm, 0);
    if (recent > prior * 1.1) return 'up';
    if (recent < prior * 0.9) return 'down';
    return 'flat';
  }

  protected sportChartData(sport: SportStats): ChartBar[] {
    return sport.weeklyTrend.map((w, i) => ({
      label: `W${i + 1}`,
      value: w.distanceKm > 0 ? w.distanceKm : w.durationMinutes,
      active: i === sport.weeklyTrend.length - 1,
    }));
  }

  protected openRecentCompletion(item: RecentCompletionItem): void {
    void this.router.navigate(['/week'], { queryParams: { date: item.dateKey } });
  }

  protected recentIconPath(type: RecentActivityType): string {
    const paths: Record<RecentActivityType, string> = {
      running: 'm6.5 6.5 11 11M21 3l-4 4M7 17l-4 4M3 3l4 4M17 17l4 4',
      biking: 'M5 17a3 3 0 1 0 0 .1M19 17a3 3 0 1 0 0 .1M8 10h4l3 7M12 10l-2 3M14.5 6.5h2.5',
      swimming: 'M2 16c1.2 0 1.8-1 3-1s1.8 1 3 1 1.8-1 3-1 1.8 1 3 1 1.8-1 3-1 1.8 1 3 1M7 9l4-2 4 2',
      strength: 'M3 8h4v8H3zM17 8h4v8h-4zM7 11h10v2H7z',
      mobility: 'M12 4v16M5 11c2.5 0 2.5-2.5 5-2.5S12.5 11 15 11s2.5-2.5 5-2.5',
      other: 'M12 5v14M5 12h14',
    };

    return paths[type];
  }

  protected formatRecentDistance(distanceKm: number | null): string {
    if (!distanceKm || distanceKm <= 0) return '';
    return `${distanceKm % 1 === 0 ? distanceKm.toFixed(0) : distanceKm.toFixed(1)} km`;
  }

  private toRecentFromWorkoutLog(log: WorkoutLog): RecentCompletionItem | null {
    const completedAt = this.parseDate(log.completedAt);
    if (!completedAt) return null;

    const title = (log.title ?? '').trim() || this.labelForActivity(log.sessionType);

    return {
      id: log.id,
      source: 'logged',
      title,
      completedAt,
      completedAtLabel: this.formatRecentDate(completedAt),
      dateKey: this.toDateString(completedAt),
      activityType: this.toActivityType(log.sessionType, log.sportType),
      durationMinutes: log.actualDuration ?? log.plannedDuration ?? null,
      distanceKm: log.actualDistance ?? null,
    };
  }

  private toRecentFromPlannedSession(
    session: PlannedSession,
    eventsById: Map<string, CalendarEvent>,
  ): RecentCompletionItem | null {
    const completedAt = this.resolvePlannedCompletionDate(session, eventsById);
    if (!completedAt) return null;

    return {
      id: session.id,
      source: 'planned',
      title: this.labelForActivity(session.sessionType),
      completedAt,
      completedAtLabel: this.formatRecentDate(completedAt),
      dateKey: this.toDateString(completedAt),
      activityType: this.toActivityType(session.sessionType, session.discipline ?? undefined),
      durationMinutes: session.duration ?? null,
      distanceKm: session.distanceTarget ?? null,
    };
  }

  private resolvePlannedCompletionDate(
    session: PlannedSession,
    eventsById: Map<string, CalendarEvent>,
  ): Date | null {
    const direct = this.parseDate(session.completedAt);
    if (direct) {
      return direct;
    }

    if (!session.linkedCalendarEventId) {
      return null;
    }

    const linkedEvent = eventsById.get(session.linkedCalendarEventId);
    if (!linkedEvent?.date) {
      return null;
    }

    return this.parseDate(`${linkedEvent.date}T${linkedEvent.endTime ?? '00:00'}:00`);
  }

  private parseDate(value: string | null | undefined): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private formatRecentDate(date: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(date);
  }

  private toDateString(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private isInCurrentIsoWeek(date: Date): boolean {
    const now = new Date();
    const weekStart = this.startOfIsoWeek(now);
    const nextWeekStart = new Date(weekStart);
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);
    return date >= weekStart && date < nextWeekStart;
  }

  private startOfIsoWeek(date: Date): Date {
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = copy.getDay();
    const delta = day === 0 ? -6 : 1 - day;
    copy.setDate(copy.getDate() + delta);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  private labelForActivity(sessionType: string): string {
    const key = sessionType.toLowerCase();
    const map: Record<string, string> = {
      running: 'Run',
      run: 'Run',
      cycling: 'Ride',
      biking: 'Ride',
      bike: 'Ride',
      swimming: 'Swim',
      swim: 'Swim',
      strength: 'Strength',
      yoga_mobility: 'Yoga / Mobility',
      mobility: 'Mobility',
      pilates: 'Pilates',
      hiit: 'HIIT',
      walking_hiking: 'Walk / Hike',
      brick: 'Brick',
    };
    return map[key] ?? sessionType;
  }

  private toActivityType(sessionType: string, fallbackType?: string): RecentActivityType {
    const key = `${sessionType} ${fallbackType ?? ''}`.toLowerCase();
    if (key.includes('run')) return 'running';
    if (key.includes('bike') || key.includes('cycl')) return 'biking';
    if (key.includes('swim')) return 'swimming';
    if (key.includes('strength')) return 'strength';
    if (key.includes('mobility') || key.includes('yoga') || key.includes('pilates')) return 'mobility';
    return 'other';
  }
}
