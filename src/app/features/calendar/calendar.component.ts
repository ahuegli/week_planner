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

  onDayDrop(day: number, drop: CdkDragDrop<CalendarEvent[]>): void {
    this.dayDrop.emit({ day, drop });
  }
}
