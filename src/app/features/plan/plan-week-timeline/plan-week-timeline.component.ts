import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { PlanPhase, PlanSessionSummary, PlanWeekSummary, TrainingPlan } from '../../../core/models/app-data.models';
import { getWorkoutDescription } from '../../../core/utils/workout-descriptions';

interface PhaseGroup {
  phase: PlanPhase;
  label: string;
  startWeek: number;
  endWeek: number;
  color: string;
  weeks: PlanWeekSummary[];
}

@Component({
  selector: 'app-plan-week-timeline',
  imports: [UpperCasePipe],
  templateUrl: './plan-week-timeline.component.html',
  styleUrl: './plan-week-timeline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanWeekTimelineComponent {
  readonly plan = input.required<TrainingPlan>();
  readonly weeks = input.required<PlanWeekSummary[]>();
  readonly expandedWeekNumber = input<number | null>(null);
  readonly weekToggleRequested = output<number>();
  protected readonly whyExpandedSessionKeys = signal<string[]>([]);

  private readonly phaseColors: Record<string, string> = {
    base: '#7BA1C7',
    build: 'var(--color-primary)',
    peak: '#1e3554',
    taper: '#A0B4C7',
    maintenance: '#A0B4C7',
  };

  protected readonly phaseGroups = computed<PhaseGroup[]>(() => {
    const plan = this.plan();
    const weeks = this.weeks();

    if (plan.phases?.length) {
      return plan.phases.map((phase) => ({
        phase: phase.name,
        label: phase.name.charAt(0).toUpperCase() + phase.name.slice(1) + ' Phase',
        startWeek: phase.startWeek,
        endWeek: phase.endWeek,
        color: this.phaseColors[phase.name] ?? 'var(--color-primary)',
        weeks: weeks.filter((w) => w.phase === phase.name),
      }));
    }

    const byPhase = new Map<PlanPhase, PlanWeekSummary[]>();
    for (const week of weeks) {
      const list = byPhase.get(week.phase) ?? [];
      list.push(week);
      byPhase.set(week.phase, list);
    }

    return Array.from(byPhase.entries()).map(([phase, phaseWeeks]) => {
      const sorted = [...phaseWeeks].sort((a, b) => a.weekNumber - b.weekNumber);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];

      return {
        phase,
        label: phase.charAt(0).toUpperCase() + phase.slice(1) + ' Phase',
        startWeek: first.weekNumber,
        endWeek: last.weekNumber,
        color: this.phaseColors[phase] ?? 'var(--color-primary)',
        weeks: sorted,
      };
    });
  });

  protected weekCircleState(week: PlanWeekSummary): 'complete' | 'partial' | 'current' | 'future' {
    if (week.isCurrentWeek) return 'current';
    if (week.totalSessions === 0) return 'future';
    if (week.completedSessions === week.totalSessions) return 'complete';
    if (week.completedSessions > 0) return 'partial';
    return 'future';
  }

  protected weekDateRange(startDate: string): string {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const month = (d: Date) => new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(d);
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()}–${end.getDate()} ${month(start)}`;
    }
    return `${start.getDate()} ${month(start)}–${end.getDate()} ${month(end)}`;
  }

  protected keySessionCount(week: PlanWeekSummary): number {
    return week.sessions.filter((s) => s.priority === 'key').length;
  }

  protected completionLabel(week: PlanWeekSummary): string {
    if (week.isCurrentWeek || week.completedSessions > 0) {
      return `${week.completedSessions}/${week.totalSessions}`;
    }
    if (week.sessions.every((s) => s.status === 'pending')) {
      return '—';
    }
    return `${week.completedSessions}/${week.totalSessions}`;
  }

  protected isExpanded(week: PlanWeekSummary): boolean {
    return this.expandedWeekNumber() === week.weekNumber;
  }

  protected toggleWeek(week: PlanWeekSummary): void {
    this.weekToggleRequested.emit(week.weekNumber);
  }

  protected sessionTypeLabel(type: string): string {
    const map: Record<string, string> = {
      easy_run: 'Easy Run',
      long_run: 'Long Run',
      tempo: 'Tempo Run',
      intervals: 'Intervals',
      strength: 'Strength Training',
      yoga: 'Yoga & Mobility',
      hill_reps: 'Hill Reps',
    };
    return map[type] ?? type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  protected sessionDetails(session: PlanSessionSummary): string {
    const parts = [`${session.duration} min`];
    if (session.distanceTarget) {
      parts.push(`${session.distanceTarget} km`);
    }
    return parts.join(' · ');
  }

  protected isCompleted(session: PlanSessionSummary): boolean {
    return session.status === 'completed';
  }

  protected isSkipped(session: PlanSessionSummary): boolean {
    return session.status === 'skipped';
  }

  protected isPending(session: PlanSessionSummary): boolean {
    return session.status === 'pending' || session.status === 'scheduled';
  }

  protected weekFooter(week: PlanWeekSummary): string {
    if (week.completedSessions === 0 && week.sessions.every((session) => session.status === 'pending')) {
      return 'Not yet started';
    }
    return `${week.completedSessions} of ${week.totalSessions} completed`;
  }

  protected sessionDescription(session: PlanSessionSummary, week: PlanWeekSummary) {
    return getWorkoutDescription(
      session.sessionType,
      week.phase,
      week.weekNumber,
      this.plan().mode,
      this.plan().sportType,
      session.duration,
    );
  }

  protected sessionKey(week: PlanWeekSummary, session: PlanSessionSummary, index: number): string {
    return `${week.weekNumber}:${session.sessionType}:${index}`;
  }

  protected toggleWhy(sessionKey: string): void {
    this.whyExpandedSessionKeys.update((current) =>
      current.includes(sessionKey)
        ? current.filter((key) => key !== sessionKey)
        : [...current, sessionKey],
    );
  }

  protected isWhyExpanded(sessionKey: string): boolean {
    return this.whyExpandedSessionKeys().includes(sessionKey);
  }
}
