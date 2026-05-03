import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe, TitleCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { StatsSummary, StreakStats, WeeklyStats, SportStats } from '../core/models/app-data.models';
import { StatsApiService } from '../core/services/stats-api.service';
import { MiniBarChartComponent, ChartBar } from '../features/stats/components/mini-bar-chart.component';
import { calculateBadges, Badge } from '../features/stats/utils/badge-calculator';
import { calculateTaskBadges } from '../features/stats/utils/task-badge-calculator';

const RING_R = 36;
export const RING_C = +(2 * Math.PI * RING_R).toFixed(2);
type StatsPeriod = 'this-week' | 'all-time';

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

    const [summaryResult, weeklyResult, streaksResult] = await Promise.allSettled([
      firstValueFrom(this.statsApi.getSummary()),
      firstValueFrom(this.statsApi.getWeekly()),
      firstValueFrom(this.statsApi.getStreaks()),
    ]);

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
}
