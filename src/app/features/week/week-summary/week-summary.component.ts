import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { PlannedSession } from '../../../core/models/app-data.models';

@Component({
  selector: 'app-week-summary',
  imports: [],
  templateUrl: './week-summary.component.html',
  styleUrl: './week-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeekSummaryComponent {
  readonly completedWorkouts = input.required<number>();
  readonly plannedWorkouts = input.required<number>();
  readonly unplacedCount = input.required<number>();
  readonly unplacedSessions = input<PlannedSession[]>([]);
  readonly weekNumber = input.required<number>();
  readonly phase = input.required<string>();
  readonly schedulingSessionId = input<string | null>(null);

  readonly completedRequested = output<void>();
  readonly weekRequested = output<void>();
  readonly scheduleRequested = output<string>();

  protected readonly isUnplacedSheetOpen = signal(false);

  protected readonly workoutStat = computed(
    () => `${this.completedWorkouts()}/${this.plannedWorkouts()}`,
  );

  protected readonly hasUnplaced = computed(() => this.unplacedCount() > 0);

  protected readonly phaseLabel = computed(() => this.toTitleCase(this.phase()));

  constructor() {
    effect(() => {
      if (!this.hasUnplaced()) {
        this.isUnplacedSheetOpen.set(false);
      }
    });
  }

  protected openWorkouts(): void {
    this.completedRequested.emit();
  }

  protected openWeek(): void {
    this.weekRequested.emit();
  }

  protected openUnplaced(): void {
    if (!this.hasUnplaced()) {
      return;
    }

    this.isUnplacedSheetOpen.set(true);
  }

  protected closeUnplaced(): void {
    this.isUnplacedSheetOpen.set(false);
  }

  protected scheduleSession(sessionId: string): void {
    this.scheduleRequested.emit(sessionId);
  }

  protected sessionTypeLabel(session: PlannedSession): string {
    return this.toTitleCase(session.sessionType.replace(/_/g, ' '));
  }

  protected sessionDetails(session: PlannedSession): string {
    const bits = [`${session.duration} min`, this.toTitleCase(session.intensity)];
    if (session.distanceTarget) {
      bits.push(`${session.distanceTarget} km`);
    }
    return bits.join(' · ');
  }

  protected isScheduling(sessionId: string): boolean {
    return this.schedulingSessionId() === sessionId;
  }

  private toTitleCase(value: string): string {
    return value
      .split(/[_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
