import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CustomEvent } from '../../core/models/custom-event.model';
import { CustomEventTemplateDragData } from '../../core/models/drag-data.model';

@Component({
  selector: 'app-custom-events-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './custom-events-manager.component.html',
  styleUrl: './custom-events-manager.component.scss',
})
export class CustomEventsManagerComponent {
  @Input() customEvents: CustomEvent[] = [];
  @Input() dayDropListIds: string[] = [];
  @Output() addCustomEvent = new EventEmitter<{ customEvent: CustomEvent; days: number[] }>();
  @Output() deleteCustomEvent = new EventEmitter<string>();

  readonly dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  showForm = signal(false);
  formData = signal({
    title: '',
    startTime: '18:00',
    endTime: '19:00',
    notes: '',
    commuteMinutes: 0,
    isRepeatingWeekly: false,
    selectedDays: new Set<number>(),
  });

  onToggleForm(): void {
    this.showForm.update((v) => !v);
    if (!this.showForm()) {
      this.resetForm();
    }
  }

  onDayToggle(dayIndex: number): void {
    this.formData.update((data) => {
      const updated = { ...data, selectedDays: new Set(data.selectedDays) };
      if (updated.selectedDays.has(dayIndex)) {
        updated.selectedDays.delete(dayIndex);
      } else {
        updated.selectedDays.add(dayIndex);
      }
      return updated;
    });
  }

  onAddCustomEvent(): void {
    const { title, startTime, endTime, notes, commuteMinutes, isRepeatingWeekly, selectedDays } = this.formData();
    if (!title.trim() || !startTime || !endTime) {
      alert('Please fill in title and times');
      return;
    }

    const days = isRepeatingWeekly 
      ? [0, 1, 2, 3, 4, 5, 6] 
      : Array.from(selectedDays).sort((a, b) => a - b);

    if (days.length === 0) {
      alert('Please select at least one day');
      return;
    }

    const customEvent: CustomEvent = {
      id: crypto.randomUUID(),
      title,
      startTime,
      endTime,
      notes: notes || undefined,
      commuteMinutes: commuteMinutes || undefined,
      isRepeatingWeekly,
    };

    this.addCustomEvent.emit({ customEvent, days });
    this.resetForm();
    this.showForm.set(false);
  }

  onDeleteCustomEvent(id: string): void {
    this.deleteCustomEvent.emit(id);
  }

  createDragData(customEvent: CustomEvent): CustomEventTemplateDragData {
    return { kind: 'custom-event-template', customEvent };
  }

  isDaySelected(dayIndex: number): boolean {
    return this.formData().selectedDays.has(dayIndex);
  }

  private resetForm(): void {
    this.formData.set({
      title: '',
      startTime: '18:00',
      endTime: '19:00',
      notes: '',
      commuteMinutes: 0,
      isRepeatingWeekly: false,
      selectedDays: new Set<number>(),
    });
  }
}
