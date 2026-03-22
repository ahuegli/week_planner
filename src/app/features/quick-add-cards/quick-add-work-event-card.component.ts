import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-quick-add-work-shift-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quick-add-work-event-card.component.html',
  styleUrl: './quick-add-work-event-card.component.scss',
})
export class QuickAddWorkShiftCardComponent {
  @Input() presetDay: number | null = null;
  @Input() presetDayLabel = '';
  @Input() allowRepeat = true;
  @Input() presetWeekOffset = 0;

  @Output() eventAdded = new EventEmitter<{
    title: string;
    startTime: string;
    endTime: string;
    commute: number;
    bedtime?: string;
    wakeTime?: string;
    repeat: number[];
    weekOffset: number;
  }>();

  @Output() closed = new EventEmitter<void>();

  // Use individual signals for better reactivity with ngModel
  title = signal('');
  startTime = signal('09:00');
  endTime = signal('10:00');
  commute = signal(0);
  bedtime = signal('');
  wakeTime = signal('');
  repeat = signal<number[]>([]);

  daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  onAdd(): void {
    if (this.title().trim()) {
      this.eventAdded.emit({
        title: this.title(),
        startTime: this.startTime(),
        endTime: this.endTime(),
        commute: this.commute(),
        bedtime: this.bedtime() || undefined,
        wakeTime: this.wakeTime() || undefined,
        repeat: this.getSelectedDays(),
        weekOffset: this.presetWeekOffset,
      });
      this.resetForm();
    }
  }

  onCancel(): void {
    this.resetForm();
    this.closed.emit();
  }

  onDayToggle(dayIndex: number): void {
    const current = this.repeat();
    if (current.includes(dayIndex)) {
      this.repeat.set(current.filter(d => d !== dayIndex));
    } else {
      this.repeat.set([...current, dayIndex]);
    }
  }

  isDaySelected(dayIndex: number): boolean {
    return this.repeat().includes(dayIndex);
  }

  private getSelectedDays(): number[] {
    if (!this.allowRepeat && this.presetDay !== null) {
      return [this.presetDay];
    }

    return this.repeat();
  }

  private resetForm(): void {
    this.title.set('');
    this.startTime.set('09:00');
    this.endTime.set('10:00');
    this.commute.set(0);
    this.bedtime.set('');
    this.wakeTime.set('');
    this.repeat.set([]);
  }
}
