import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-quick-add-personal-event-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quick-add-personal-event-card.component.html',
  styleUrl: './quick-add-personal-event-card.component.scss',
})
export class QuickAddPersonalEventCardComponent {
  @Output() eventAdded = new EventEmitter<{
    title: string;
    startTime: string;
    endTime: string;
    commute: number;
    repeat: number[];
  }>();

  @Output() closed = new EventEmitter<void>();

  // Use individual signals for better reactivity with ngModel
  title = signal('');
  startTime = signal('14:00');
  endTime = signal('15:00');
  commute = signal(0);
  repeat = signal<number[]>([]);

  daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  onAdd(): void {
    if (this.title().trim()) {
      this.eventAdded.emit({
        title: this.title(),
        startTime: this.startTime(),
        endTime: this.endTime(),
        commute: this.commute(),
        repeat: this.repeat(),
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

  private resetForm(): void {
    this.title.set('');
    this.startTime.set('14:00');
    this.endTime.set('15:00');
    this.commute.set(0);
    this.repeat.set([]);
  }
}
