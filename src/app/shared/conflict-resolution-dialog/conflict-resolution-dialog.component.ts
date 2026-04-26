import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { ConflictCheckResult, ConflictMove } from '../../core/models/app-data.models';

@Component({
  selector: 'app-conflict-resolution-dialog',
  standalone: true,
  imports: [],
  templateUrl: './conflict-resolution-dialog.component.html',
  styleUrl: './conflict-resolution-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConflictResolutionDialogComponent {
  readonly open = input(false);
  readonly result = input<ConflictCheckResult | null>(null);
  readonly newEventTitle = input('');

  readonly applyChanges = output<ConflictMove[]>();
  readonly keepEverything = output<void>();
  readonly cancel = output<void>();

  protected readonly rejectedIds = signal<Set<string>>(new Set());

  protected readonly conflicts = computed(() => this.result()?.conflicts ?? []);

  protected readonly isSimple = computed(() => {
    const c = this.conflicts();
    return c.length === 1 && c[0].suggestion.action === 'shift_time';
  });

  protected readonly acceptedMoves = computed<ConflictMove[]>(() => {
    const rejected = this.rejectedIds();
    return this.conflicts()
      .filter((c) => !rejected.has(c.eventId) && c.suggestion.action !== 'cannot_resolve')
      .map((c) => ({
        eventId: c.eventId,
        newDate: c.suggestion.suggestedDate ?? c.date,
        newStartTime: c.suggestion.suggestedStartTime ?? c.startTime,
        newEndTime: c.suggestion.suggestedEndTime ?? c.endTime,
      }));
  });

  protected isAccepted(eventId: string): boolean {
    return !this.rejectedIds().has(eventId);
  }

  protected toggleAccepted(eventId: string): void {
    this.rejectedIds.update((set) => {
      const next = new Set(set);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  }

  protected onApply(): void {
    this.applyChanges.emit(this.acceptedMoves());
    this.rejectedIds.set(new Set());
  }

  protected onKeep(): void {
    this.keepEverything.emit();
    this.rejectedIds.set(new Set());
  }

  protected onCancel(): void {
    this.cancel.emit();
    this.rejectedIds.set(new Set());
  }

  protected priorityLabel(priority: string): string {
    if (priority === 'key') return 'Key';
    if (priority === 'optional') return 'Optional';
    return 'Supporting';
  }

  protected dayName(day: number): string {
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][day] ?? '';
  }
}
