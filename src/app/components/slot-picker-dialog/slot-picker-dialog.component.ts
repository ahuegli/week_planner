import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Note, SlotCandidate } from '../../core/models/app-data.models';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

@Component({
  selector: 'app-slot-picker-dialog',
  imports: [],
  templateUrl: './slot-picker-dialog.component.html',
  styleUrl: './slot-picker-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SlotPickerDialogComponent {
  readonly open = input(false);
  readonly note = input<Note | null>(null);
  readonly slots = input<SlotCandidate[]>([]);

  readonly slotSelected = output<SlotCandidate>();
  readonly cancelled = output<void>();

  protected readonly displaySlots = computed(() =>
    this.slots().map((slot) => ({
      slot,
      dayLabel: DAY_NAMES[slot.day] ?? slot.label,
      dateLabel: this.formatDate(slot.date),
      timeRange: `${slot.startTime} – ${slot.endTime}`,
    })),
  );

  protected select(slot: SlotCandidate): void {
    this.slotSelected.emit(slot);
  }

  protected cancel(): void {
    this.cancelled.emit();
  }

  private formatDate(dateStr: string): string {
    const d = new Date(`${dateStr}T00:00:00`);
    return `${d.getDate()} ${MONTH_LABELS[d.getMonth()]}`;
  }
}
