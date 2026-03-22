import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CalendarEvent } from '../../../core/models/calendar-event.model';
import { PlannerService } from '../../../core/services/planner.service';

@Component({
  selector: 'app-event-details-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './event-details-modal.component.html',
  styleUrl: './event-details-modal.component.scss',
})
export class EventDetailsModalComponent implements OnInit {
  @Input({ required: true }) event!: CalendarEvent;
  @Output() close = new EventEmitter<void>();
  @Output() updateEvent = new EventEmitter<CalendarEvent>();
  @Output() updateCommuteForDay = new EventEmitter<{ eventId: string; commuteMinutes: number }>();
  @Output() updateCommuteForAllShifts = new EventEmitter<{ shiftLabel: string; shiftStartTime: string; commuteMinutes: number }>();

  readonly dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  isEditing = signal(false);
  editData = signal({
    title: '',
    startTime: '',
    endTime: '',
    notes: '',
    commuteMinutes: 0,
    day: 0,
  });

  constructor(private readonly planner: PlannerService) {}

  ngOnInit(): void {
    this.initializeEditData();
  }

  private initializeEditData(): void {
    this.editData.set({
      title: this.event.title,
      startTime: this.event.startTime,
      endTime: this.event.endTime,
      notes: this.event.notes || '',
      commuteMinutes: this.event.commuteMinutes || 0,
      day: this.event.day,
    });
  }

  onEdit(): void {
    this.isEditing.set(true);
  }

  onSave(): void {
    let { startTime, endTime } = this.editData();
    // If workout or mealprep, auto-adjust endTime based on duration
    if ((this.event.type === 'workout' || this.event.type === 'mealprep') && this.event.durationMinutes) {
      endTime = this.addMinutesToTime(startTime, this.event.durationMinutes);
    }
    const updated: CalendarEvent = {
      ...this.event,
      title: this.editData().title,
      startTime,
      endTime,
      day: this.editData().day,
      notes: this.editData().notes || undefined,
      commuteMinutes: this.editData().commuteMinutes,
    };
    // If this is a shift and commute changed, ask user whether to apply to single day or all shifts
    if (this.event.type === 'shift' && this.editData().commuteMinutes !== (this.event.commuteMinutes || 0)) {
      this.handleCommuteUpdate();
    } else {
      this.updateEvent.emit(updated);
    }
    this.isEditing.set(false);
  }

  private addMinutesToTime(start: string, minutes: number): string {
    const [h, m] = start.split(':').map(Number);
    const total = h * 60 + m + minutes;
    const endH = Math.floor(total / 60) % 24;
    const endM = total % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  }

  private handleCommuteUpdate(): void {
    const apply = confirm(
      'Apply this commute change to:\nOK = This day only\nCancel = All shifts with this name'
    );

    if (apply) {
      // Apply to this day only
      this.updateCommuteForDay.emit({
        eventId: this.event.id,
        commuteMinutes: this.editData().commuteMinutes,
      });
    } else {
      // Apply to all shifts with same label and start time
      this.updateCommuteForAllShifts.emit({
        shiftLabel: this.event.title,
        shiftStartTime: this.event.startTime,
        commuteMinutes: this.editData().commuteMinutes,
      });
    }
  }

  onCancel(): void {
    this.initializeEditData();
    this.isEditing.set(false);
  }

  onClose(): void {
    this.close.emit();
  }

  getCommuteStartTime(startTime: string, commuteMinutes: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes - commuteMinutes;
    const commuteHours = Math.floor(totalMinutes / 60);
    const commuteMin = totalMinutes % 60;
    return `${String(commuteHours).padStart(2, '0')}:${String(commuteMin).padStart(2, '0')}`;
  }
}
