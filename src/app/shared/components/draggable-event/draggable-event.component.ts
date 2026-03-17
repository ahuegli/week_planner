import { CdkDrag } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CalendarEvent } from '../../../core/models/calendar-event.model';

@Component({
  selector: 'app-draggable-event',
  standalone: true,
  imports: [CommonModule, CdkDrag],
  templateUrl: './draggable-event.component.html',
  styleUrl: './draggable-event.component.scss',
})
export class DraggableEventComponent {
  @Input({ required: true }) event!: CalendarEvent;
  @Output() remove = new EventEmitter<string>();
  @Output() select = new EventEmitter<CalendarEvent>();

  readonly dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  onRemove(e: Event): void {
    e.stopPropagation();
    this.remove.emit(this.event.id);
  }

  onSelect(): void {
    this.select.emit(this.event);
  }
}
