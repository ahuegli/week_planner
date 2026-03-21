import { CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ViewChild, ElementRef, Renderer2, inject } from '@angular/core';
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
  @Output() eventDropped = new EventEmitter<{ drop: CdkDragDrop<CalendarEvent[]>; startTimeMinutes?: number }>();
  @Output() eventRemoved = new EventEmitter<string>();
  @Output() eventSelected = new EventEmitter<CalendarEvent>();

  @ViewChild('dropZone') dropZone!: ElementRef;

  // Time grid (0:00 to 23:59 = 24 hours)
  readonly timeSlots = Array.from({ length: 24 }, (_, i) => i);
  private readonly START_HOUR = 0; // Start at midnight
  private readonly SLOT_HEIGHT = 40; // pixels per hour

  hoverTime: string | null = null;
  showTimePreview = false;
  previewTop = 0;
  private lastHoverTimeMinutes: number | null = null;

  private renderer = inject(Renderer2);
  private unlistenDropZoneHover: (() => void) | null = null;
  private unlistenDropZoneMove: (() => void) | null = null;
  private unlistenDropZoneLeave: (() => void) | null = null;

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

  getTimeFromDropPosition(clientY: number): { timeString: string; minutes: number } {
    if (!this.dropZone) return { timeString: '--:--', minutes: 0 };
    
    const rect = this.dropZone.nativeElement.getBoundingClientRect();
    const relativeY = clientY - rect.top;
    
    // Convert pixels to minutes (40px per hour = 2/3 px/min)
    const minutes = Math.round((relativeY / this.SLOT_HEIGHT) * 60);
    
    // Snap to 30-minute intervals
    const snappedMinutes = Math.round(minutes / 30) * 30;
    
    // Ensure within valid range (0-1439 minutes)
    const validMinutes = Math.max(0, Math.min(1439, snappedMinutes));
    
    const hours = Math.floor(validMinutes / 60);
    const mins = validMinutes % 60;
    const timeString = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    
    return { timeString, minutes: validMinutes };
  }

  onDropZoneEnter(): void {
    this.showTimePreview = true;
    if (this.dropZone) {
      this.unlistenDropZoneMove = this.renderer.listen(this.dropZone.nativeElement, 'mousemove', (e: MouseEvent) => {
        this.updateTimePreview(e);
      });
      
      this.unlistenDropZoneLeave = this.renderer.listen(this.dropZone.nativeElement, 'mouseleave', () => {
        this.showTimePreview = false;
        if (this.unlistenDropZoneMove) {
          this.unlistenDropZoneMove();
          this.unlistenDropZoneMove = null;
        }
        if (this.unlistenDropZoneLeave) {
          this.unlistenDropZoneLeave();
          this.unlistenDropZoneLeave = null;
        }
      });
    }
  }

  updateTimePreview(event: MouseEvent): void {
    const result = this.getTimeFromDropPosition(event.clientY);
    this.hoverTime = result.timeString;
    this.lastHoverTimeMinutes = result.minutes;
    
    if (this.dropZone) {
      const rect = this.dropZone.nativeElement.getBoundingClientRect();
      const relativeY = event.clientY - rect.top;
      this.previewTop = Math.max(0, relativeY - 12); // Offset for centering
    }
  }

  onDrop(event: CdkDragDrop<CalendarEvent[]>): void {
    let startTimeMinutes = this.lastHoverTimeMinutes;
    
    // Fallback: calculate time from drop event position if no hover time captured
    if (startTimeMinutes === null && this.dropZone) {
      const result = this.getTimeFromDropPosition(event.dropPoint.y);
      startTimeMinutes = result.minutes;
    }
    
    this.eventDropped.emit({ drop: event, startTimeMinutes: startTimeMinutes || undefined });
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
