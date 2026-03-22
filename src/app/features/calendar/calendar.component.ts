import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, EventEmitter, Input, Output, ViewChild, ElementRef, Renderer2, inject } from '@angular/core';
import { CalendarEvent } from '../../core/models/calendar-event.model';
import { DayColumnComponent } from '../../shared/components/day-column/day-column.component';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, DayColumnComponent],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss',
})
export class CalendarComponent implements AfterViewInit {
  @Input() dayLabels: string[] = [];
  @Input() eventsByDay: CalendarEvent[][] = [];
  @Input() connectedDropListIds: string[] = [];
  @ViewChild('timeSlots') timeSlots!: ElementRef;
  @ViewChild('scrollWrapper') scrollWrapper!: ElementRef;
  @ViewChild('calendarGrid') calendarGrid!: ElementRef;

  @Output() dayDrop = new EventEmitter<{ day: number; drop: CdkDragDrop<CalendarEvent[]>; startTime?: number }>();
  @Output() eventRemoved = new EventEmitter<string>();
  @Output() eventSelected = new EventEmitter<CalendarEvent>();

  private renderer = inject(Renderer2);
  private isSyncing = false;

  // Time grid hours (0:00 to 23:59 = 24 hours)
  readonly timeGridSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i;
    return {
      hour,
      label: hour < 12 ? (hour === 0 ? '12am' : `${hour}am`) : hour === 12 ? '12pm' : `${hour - 12}pm`,
    };
  });

  // Get today's day index (0 = Monday, 6 = Sunday)
  get todayIndex(): number {
    const jsDay = new Date().getDay();
    // Convert JS day (0=Sun) to our format (0=Mon)
    return jsDay === 0 ? 6 : jsDay - 1;
  }

  ngAfterViewInit(): void {
    // Scroll to 7am (hour 7) by default to focus on 7am-10pm range
    if (this.scrollWrapper && this.scrollWrapper.nativeElement) {
      const scrollToPixels = 7 * 40; // 7 hours * 40px per hour
      this.scrollWrapper.nativeElement.scrollTop = scrollToPixels;
      
      // Synchronize scroll between scroll-wrapper and time-slots
      this.renderer.listen(this.scrollWrapper.nativeElement, 'scroll', () => {
        if (!this.isSyncing) {
          this.isSyncing = true;
          if (this.timeSlots && this.timeSlots.nativeElement) {
            this.timeSlots.nativeElement.scrollTop = this.scrollWrapper.nativeElement.scrollTop;
          }
          setTimeout(() => (this.isSyncing = false), 0);
        }
      });
      
      // Also synchronize if timeSlots is scrolled (for arrow key handling)
      if (this.timeSlots && this.timeSlots.nativeElement) {
        this.renderer.listen(this.timeSlots.nativeElement, 'scroll', () => {
          if (!this.isSyncing) {
            this.isSyncing = true;
            this.scrollWrapper.nativeElement.scrollTop = this.timeSlots.nativeElement.scrollTop;
            setTimeout(() => (this.isSyncing = false), 0);
          }
        });
      }
    } else if (this.timeSlots && this.timeSlots.nativeElement) {
      const scrollToPixels = 7 * 40; // 7 hours * 40px per hour
      this.timeSlots.nativeElement.scrollTop = scrollToPixels;
    }
  }

  getTimeFromDropPosition(dropY: number, scrollContainer: HTMLElement): number {
    // Calculate position relative to viewport
    const containerRect = scrollContainer.getBoundingClientRect();
    const relativeY = dropY - containerRect.top + scrollContainer.scrollTop;
    
    // Convert pixels to minutes (40px per hour = 40px/60min = 2/3 px/min)
    const minutes = Math.round((relativeY / 40) * 60);
    
    // Snap to 30-minute intervals
    const snappedMinutes = Math.round(minutes / 30) * 30;
    
    // Ensure within valid range (0-1439 minutes = 24 hours)
    return Math.max(0, Math.min(1439, snappedMinutes));
  }

  onDayDrop(day: number, event: { drop: CdkDragDrop<CalendarEvent[]>; startTimeMinutes?: number }): void {
    const drop = event.drop;
    const startTime = event.startTimeMinutes;
    
    this.dayDrop.emit({ day, drop, startTime });
  }

  onEventSelected(event: CalendarEvent): void {
    this.eventSelected.emit(event);
  }
}
