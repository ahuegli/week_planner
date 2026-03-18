import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CalendarEvent } from '../../core/models/calendar-event.model';
import { DayColumnComponent } from '../../shared/components/day-column/day-column.component';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, DayColumnComponent],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss',
})
export class CalendarComponent {
  @Input() dayLabels: string[] = [];
  @Input() eventsByDay: CalendarEvent[][] = [];
  @Input() connectedDropListIds: string[] = [];

  @Output() dayDrop = new EventEmitter<{ day: number; drop: CdkDragDrop<CalendarEvent[]> }>();
  @Output() eventRemoved = new EventEmitter<string>();
  @Output() eventSelected = new EventEmitter<CalendarEvent>();

  // Time grid hours (6am to 10pm)
  readonly timeSlots = Array.from({ length: 17 }, (_, i) => {
    const hour = i + 6;
    return {
      hour,
      label: hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`,
    };
  });

  // Get today's day index (0 = Monday, 6 = Sunday)
  get todayIndex(): number {
    const jsDay = new Date().getDay();
    // Convert JS day (0=Sun) to our format (0=Mon)
    return jsDay === 0 ? 6 : jsDay - 1;
  }

  onDayDrop(day: number, drop: CdkDragDrop<CalendarEvent[]>): void {
    this.dayDrop.emit({ day, drop });
  }

  onEventSelected(event: CalendarEvent): void {
    this.eventSelected.emit(event);
  }
}
