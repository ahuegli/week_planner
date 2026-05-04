import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { PlanMode, PlanWeekSummary } from '../../../core/models/app-data.models';
import { getWorkoutDescription } from '../../../core/utils/workout-descriptions';

@Component({
  selector: 'app-current-week-card',
  imports: [],
  templateUrl: './current-week-card.component.html',
  styleUrl: './current-week-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrentWeekCardComponent {
  readonly week = input.required<PlanWeekSummary>();
  readonly planMode = input<PlanMode>('race');
  readonly sportType = input<string | null>(null);
  readonly collapseToken = input(0);
  readonly sessionToggleRequested = output<void>();
  readonly scheduleRequested = output<void>();
  readonly completeRequested = output<{ sessionId: string; energyRating: 'easy' | 'moderate' | 'hard' }>();
  readonly skipRequested = output<string>();
  readonly startRequested = output<string>();
  protected readonly expandedSessionIndex = signal<number | null>(null);
  protected readonly whyExpandedSessionIndex = signal<number | null>(null);

  constructor() {
    effect(() => {
      this.collapseToken();
      this.expandedSessionIndex.set(null);
      this.whyExpandedSessionIndex.set(null);
    });
  }

  protected readonly phaseLabel = computed(() => {
    const p = this.week().phase;
    return p.charAt(0).toUpperCase() + p.slice(1) + ' Phase';
  });

  protected readonly hasPendingSessions = computed(() =>
    this.week().sessions.some((s) => s.status === 'pending' || s.status === 'scheduled'),
  );

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

  protected sessionDetails(session: ReturnType<typeof this.week>['sessions'][number]): string {
    const parts: string[] = [`${session.duration} min`];
    if (session.distanceTarget) {
      parts.push(`${session.distanceTarget} km`);
    }
    parts.push(session.intensity.charAt(0).toUpperCase() + session.intensity.slice(1));
    return parts.join(' · ');
  }

  protected canCheckIn(session: ReturnType<typeof this.week>['sessions'][number]): boolean {
    return !!session.id && (session.status === 'pending' || session.status === 'scheduled');
  }

  protected markDone(session: ReturnType<typeof this.week>['sessions'][number]): void {
    if (!session.id) {
      return;
    }

    this.completeRequested.emit({ sessionId: session.id, energyRating: 'moderate' });
  }

  protected skip(session: ReturnType<typeof this.week>['sessions'][number]): void {
    if (!session.id) {
      return;
    }

    this.skipRequested.emit(session.id);
  }

  protected startSession(session: ReturnType<typeof this.week>['sessions'][number]): void {
    if (session.linkedCalendarEventId) {
      this.startRequested.emit(session.linkedCalendarEventId);
    }
  }

  protected scheduleRemaining(): void {
    this.scheduleRequested.emit();
  }

  protected toggleSession(index: number): void {
    this.sessionToggleRequested.emit();
    this.expandedSessionIndex.update((current) => (current === index ? null : index));
  }

  protected isExpanded(index: number): boolean {
    return this.expandedSessionIndex() === index;
  }

  protected sessionDescription(session: ReturnType<typeof this.week>['sessions'][number]) {
    return getWorkoutDescription(
      session.sessionType,
      this.week().phase,
      this.week().weekNumber,
      this.planMode(),
      this.sportType(),
      session.duration,
    );
  }

  protected toggleWhy(index: number): void {
    this.whyExpandedSessionIndex.update((current) => (current === index ? null : index));
  }

  protected isWhyExpanded(index: number): boolean {
    return this.whyExpandedSessionIndex() === index;
  }

  protected intensityLabel(session: ReturnType<typeof this.week>['sessions'][number]): string {
    return session.intensity.charAt(0).toUpperCase() + session.intensity.slice(1);
  }

  protected showRacePace(session: ReturnType<typeof this.week>['sessions'][number]): boolean {
    return this.planMode() === 'race' && (session.sessionType === 'tempo' || session.sessionType === 'intervals');
  }
}
