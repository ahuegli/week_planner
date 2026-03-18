import { CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CalendarEvent } from '../../../core/models/calendar-event.model';
import { DraggableEventComponent } from '../draggable-event/draggable-event.component';

@Component({
  selector: 'app-day-column',
  standalone: true,
  imports: [CommonModule, CdkDropList, DraggableEventComponent],
  templateUrl: './day-column.component.html',
  styleUrl: './day-column.component.scss',
})
export class DayColumnComponent {
  @Input({ required: true }) dayIndex!: number;
  @Input({ required: true }) dayLabel!: string;
  @Input({ required: true }) events: CalendarEvent[] = [];
  @Input({ required: true }) connectedDropLists: string[] = [];
  @Input() exhaustion = 0;
  @Input() isToday = false;

  @Output() exhaustionChanged = new EventEmitter<number>();
  @Output() eventDropped = new EventEmitter<CdkDragDrop<CalendarEvent[]>>();
  @Output() eventRemoved = new EventEmitter<string>();
  @Output() eventSelected = new EventEmitter<CalendarEvent>();

  // Time grid (6am to 10pm = 17 hours)
  readonly timeSlots = Array.from({ length: 17 }, (_, i) => i + 6);
  private readonly START_HOUR = 6;
  private readonly SLOT_HEIGHT = 40; // pixels per hour

  get listId(): string {
    return `day-${this.dayIndex}`;
  }

  getEventTop(event: CalendarEvent): number {
    const [hours, minutes] = event.startTime.split(':').map(Number);
    const totalMinutes = (hours - this.START_HOUR) * 60 + minutes;
    return (totalMinutes / 60) * this.SLOT_HEIGHT;
  }

  getEventHeight(event: CalendarEvent): number {
    if (event.durationMinutes) {
      return Math.max(24, (event.durationMinutes / 60) * this.SLOT_HEIGHT);
    }
    // Calculate from start/end times
    const [startH, startM] = event.startTime.split(':').map(Number);
    const [endH, endM] = event.endTime.split(':').map(Number);
    let duration = endH * 60 + endM - (startH * 60 + startM);
    if (duration < 0) duration += 24 * 60; // Overnight event
    return Math.max(24, (duration / 60) * this.SLOT_HEIGHT);
  }

  onDrop(event: CdkDragDrop<CalendarEvent[]>): void {
    this.eventDropped.emit(event);
  }

  onRemove(eventId: string): void {
    this.eventRemoved.emit(eventId);
  }

  onSelect(event: CalendarEvent): void {
    this.eventSelected.emit(event);
  }

  onExhaustionChange(value: string): void {
    this.exhaustionChanged.emit(Math.min(10, Math.max(0, Number(value))));
  }
}
