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

  @Output() exhaustionChanged = new EventEmitter<number>();
  @Output() eventDropped = new EventEmitter<CdkDragDrop<CalendarEvent[]>>();
  @Output() eventRemoved = new EventEmitter<string>();

  get listId(): string {
    return `day-${this.dayIndex}`;
  }

  onDrop(event: CdkDragDrop<CalendarEvent[]>): void {
    this.eventDropped.emit(event);
  }

  onRemove(eventId: string): void {
    this.eventRemoved.emit(eventId);
  }
  onExhaustionChange(value: string): void {
  this.exhaustionChanged.emit(Math.min(10, Math.max(0, Number(value))));
  }
}
