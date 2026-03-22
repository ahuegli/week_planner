import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-quick-add-mealprep-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quick-add-mealprep-card.component.html',
  styleUrl: './quick-add-mealprep-card.component.scss',
})
export class QuickAddMealPrepCardComponent {
  @Input() presetDay: number | null = null;
  @Input() presetDayLabel = '';
  @Input() presetWeekOffset = 0;

  @Output() mealPrepAdded = new EventEmitter<{
    day: number;
    weekOffset: number;
    startTime: string;
    duration: number;
    title: string;
  }>();

  @Output() closed = new EventEmitter<void>();

  readonly dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  title = signal('Meal Prep');
  duration = signal(90);
  startTime = signal('17:30');
  day = signal(this.getTodayIndex());

  onAdd(): void {
    this.mealPrepAdded.emit({
      day: this.presetDay ?? this.day(),
      weekOffset: this.presetWeekOffset,
      startTime: this.startTime(),
      duration: this.duration(),
      title: this.title().trim() || 'Meal Prep',
    });
    this.resetForm();
  }

  onCancel(): void {
    this.resetForm();
    this.closed.emit();
  }

  private resetForm(): void {
    this.title.set('Meal Prep');
    this.duration.set(90);
    this.startTime.set('17:30');
    this.day.set(this.getTodayIndex());
  }

  private getTodayIndex(): number {
    const jsDay = new Date().getDay();
    return jsDay === 0 ? 6 : jsDay - 1;
  }
}