import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CalendarEvent } from '../../mock-data';

@Component({
  selector: 'app-delete-workout-dialog',
  imports: [],
  templateUrl: './delete-workout-dialog.component.html',
  styleUrl: './delete-workout-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteWorkoutDialogComponent {
  readonly open = input(false);
  readonly event = input<CalendarEvent | null>(null);
  readonly findingBestTime = input(false);

  readonly closeRequested = output<void>();
  readonly rescheduleRequested = output<CalendarEvent>();
  readonly skipRequested = output<CalendarEvent>();
  readonly removeRequested = output<CalendarEvent>();

  protected readonly dayLabel = computed(() => {
    const activeEvent = this.event();
    if (!activeEvent) {
      return '';
    }

    if (activeEvent.date) {
      return new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(
        new Date(`${activeEvent.date}T00:00:00`),
      );
    }

    const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return weekDays[activeEvent.day ?? 0] ?? 'This week';
  });

  protected readonly timeLabel = computed(() => {
    const activeEvent = this.event();
    if (!activeEvent) {
      return '';
    }

    return `${this.toDisplayTime(activeEvent.startTime)} - ${this.toDisplayTime(activeEvent.endTime)}`;
  });

  protected readonly durationLabel = computed(() => {
    const activeEvent = this.event();
    if (!activeEvent) {
      return '';
    }

    const duration = activeEvent.duration ?? activeEvent.durationMinutes ?? this.durationFromTimes(activeEvent.startTime, activeEvent.endTime);
    return `${duration} min`;
  });

  protected readonly priorityLabel = computed(() => {
    const priority = this.event()?.priority;
    if (!priority) {
      return 'Supporting';
    }

    return priority.charAt(0).toUpperCase() + priority.slice(1);
  });

  protected close(): void {
    this.closeRequested.emit();
  }

  protected reschedule(): void {
    if (this.findingBestTime()) {
      return;
    }

    const activeEvent = this.event();
    if (!activeEvent) {
      return;
    }

    this.rescheduleRequested.emit(activeEvent);
  }

  protected skip(): void {
    const activeEvent = this.event();
    if (!activeEvent) {
      return;
    }

    this.skipRequested.emit(activeEvent);
  }

  protected remove(): void {
    const activeEvent = this.event();
    if (!activeEvent) {
      return;
    }

    this.removeRequested.emit(activeEvent);
  }

  private toDisplayTime(value: string): string {
    const [hoursText, minutesText] = value.split(':');
    const hours = Number(hoursText);
    const minutes = Number(minutesText);
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const hour12 = ((hours + 11) % 12) + 1;
    return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`;
  }

  private durationFromTimes(startTime: string, endTime: string): number {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    return endHours * 60 + endMinutes - (startHours * 60 + startMinutes);
  }
}