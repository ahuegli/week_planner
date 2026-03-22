import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, effect, inject, signal } from '@angular/core';
import { CalendarEvent } from '../../core/models/calendar-event.model';
import { PlannerService } from '../../core/services/planner.service';
import { DateCalculationService } from '../../core/services/date-calculation.service';

export interface MonthDayContext {
  day: number;
  weekOffset: number;
  label: string;
  date: Date;
}

export interface QuickAddRequest {
  kind: 'work' | 'workout' | 'personal' | 'mealprep';
  context: MonthDayContext;
}

@Component({
  selector: 'app-month-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './month-view.component.html',
  styleUrl: './month-view.component.scss',
})
export class MonthViewComponent {
  private readonly planner = inject(PlannerService);
  private readonly dateCalc = inject(DateCalculationService);

  @Input() currentMonthDate: Date = new Date();

  @Output() navigateToToday = new EventEmitter<void>();
  @Output() previousMonthClicked = new EventEmitter<void>();
  @Output() nextMonthClicked = new EventEmitter<void>();
  @Output() quickAddRequested = new EventEmitter<QuickAddRequest>();
  @Output() eventSelected = new EventEmitter<CalendarEvent>();

  selectedMonthDay = signal<MonthDayContext | null>(null);

  constructor() {
    // Manage body overflow when modal is open
    effect(() => {
      if (this.selectedMonthDay()) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });
  }

  getMonthName(): string {
    return this.currentMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  getMonthCalendarDays(): (number | null)[] {
    const year = this.currentMonthDate.getFullYear();
    const month = this.currentMonthDate.getMonth();

    let firstDay = new Date(year, month, 1).getDay();
    firstDay = (firstDay + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    while (days.length % 7 !== 0) {
      days.push(null);
    }

    return days;
  }

  isToday(day: number): boolean {
    const today = new Date();
    return (
      day === today.getDate() &&
      today.getMonth() === this.currentMonthDate.getMonth() &&
      today.getFullYear() === this.currentMonthDate.getFullYear()
    );
  }

  openMonthDayDetails(dateOfMonth: number): void {
    this.selectedMonthDay.set(this.getContextForMonthDay(dateOfMonth));
  }

  closeMonthDayDetails(): void {
    this.selectedMonthDay.set(null);
  }

  getSelectedMonthDayEvents(): CalendarEvent[] {
    const selectedDay = this.selectedMonthDay();
    return selectedDay ? this.getEventsForDate(selectedDay.date) : [];
  }

  getSelectedMonthDayLabel(): string {
    const selectedDay = this.selectedMonthDay();
    if (!selectedDay) return '';

    return selectedDay.date.toLocaleString('default', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  getSelectedMonthDaySubtitle(): string {
    const count = this.getSelectedMonthDayEvents().length;
    if (count === 0) return 'No events scheduled yet';
    return `${count} scheduled item${count === 1 ? '' : 's'}`;
  }

  getEventsForMonthDay(dateOfMonth: number): CalendarEvent[] {
    const date = new Date(
      this.currentMonthDate.getFullYear(),
      this.currentMonthDate.getMonth(),
      dateOfMonth,
    );
    return this.getEventsForDate(date);
  }

  hasEventsOnMonthDay(dateOfMonth: number): boolean {
    return this.getEventsForMonthDay(dateOfMonth).length > 0;
  }

  getEventTypeTag(eventType: string): string {
    switch (eventType) {
      case 'workout':
        return '🏋️ Workout';
      case 'shift':
        return '💼 Work';
      case 'mealprep':
        return '🍽️ Meal Prep';
      case 'custom-event':
        return '📌 Event';
      default:
        return '📅 Event';
    }
  }

  onGoToToday(): void {
    this.closeMonthDayDetails();
    this.navigateToToday.emit();
  }

  onPreviousMonth(): void {
    this.closeMonthDayDetails();
    this.previousMonthClicked.emit();
  }

  onNextMonth(): void {
    this.closeMonthDayDetails();
    this.nextMonthClicked.emit();
  }

  openWorkQuickAdd(): void {
    const context = this.selectedMonthDay();
    if (context) {
      this.quickAddRequested.emit({ kind: 'work', context });
    }
  }

  openWorkoutQuickAdd(): void {
    const context = this.selectedMonthDay();
    if (context) {
      this.quickAddRequested.emit({ kind: 'workout', context });
    }
  }

  openPersonalQuickAdd(): void {
    const context = this.selectedMonthDay();
    if (context) {
      this.quickAddRequested.emit({ kind: 'personal', context });
    }
  }

  openMealPrepQuickAdd(): void {
    const context = this.selectedMonthDay();
    if (context) {
      this.quickAddRequested.emit({ kind: 'mealprep', context });
    }
  }

  onEventClicked(event: CalendarEvent): void {
    this.eventSelected.emit(event);
  }

  private getContextForMonthDay(dateOfMonth: number): MonthDayContext {
    const date = new Date(
      this.currentMonthDate.getFullYear(),
      this.currentMonthDate.getMonth(),
      dateOfMonth,
    );
    const jsDay = date.getDay();
    const dayIndex = jsDay === 0 ? 6 : jsDay - 1;
    const weekOffset = this.dateCalc.getWeekOffsetForDate(date);

    return {
      day: dayIndex,
      weekOffset,
      label: this.dateCalc.getDayLabels()[dayIndex],
      date,
    };
  }

  private getEventsForDate(date: Date): CalendarEvent[] {
    const weekdayIndex = this.dateCalc.getDayOfWeek(date);
    const weekOffset = this.dateCalc.getWeekOffsetForDate(date);

    return this.planner
      .events()
      .filter(
        (e) =>
          e.day === weekdayIndex && (e.weekOffset === undefined || e.weekOffset === weekOffset),
      )
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }
}
