import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CustomShift } from '../../core/models/custom-shift.model';
import { CustomShiftTemplateDragData } from '../../core/models/drag-data.model';

@Component({
  selector: 'app-shift-selector',
  standalone: true,
  imports: [CommonModule, CdkDropList, CdkDrag, FormsModule],
  templateUrl: './shift-selector.component.html',
  styleUrl: './shift-selector.component.scss',
})
export class ShiftSelectorComponent {
  @Input() dayDropListIds: string[] = [];
  @Input() customShifts: CustomShift[] = [];
  @Output() addCustomShift = new EventEmitter<CustomShift>();
  @Output() updateCustomShift = new EventEmitter<{ id: string; shift: CustomShift }>();
  @Output() deleteCustomShift = new EventEmitter<string>();
  @Output() placeWeekly = new EventEmitter<CustomShift>();

  showForm = signal(false);
  editingId = signal<string | null>(null);
  formData = signal({
    label: '',
    startTime: '09:00',
    endTime: '17:00',
    commuteMinutes: 30,
  });

  onToggleForm(): void {
    this.showForm.update((v) => !v);
    if (!this.showForm()) {
      this.resetForm();
      this.editingId.set(null);
    }
  }

  onAddCustomShift(): void {
    const { label, startTime, endTime, commuteMinutes } = this.formData();
    if (!label.trim() || !startTime || !endTime) {
      alert('Please fill in all fields');
      return;
    }

    if (this.editingId()) {
      const shift: CustomShift = {
        id: this.editingId()!,
        label,
        startTime,
        endTime,
        commuteMinutes,
      };
      this.updateCustomShift.emit({ id: this.editingId()!, shift });
      this.editingId.set(null);
    } else {
      const shift: CustomShift = {
        id: crypto.randomUUID(),
        label,
        startTime,
        endTime,
        commuteMinutes,
      };
      this.addCustomShift.emit(shift);
    }

    this.resetForm();
    this.showForm.set(false);
  }

  onEditShift(shift: CustomShift): void {
    this.formData.set({
      label: shift.label,
      startTime: shift.startTime,
      endTime: shift.endTime,
      commuteMinutes: shift.commuteMinutes,
    });
    this.editingId.set(shift.id);
    this.showForm.set(true);
  }

  onCancelEdit(): void {
    this.editingId.set(null);
    this.resetForm();
    this.showForm.set(false);
  }

  onDeleteShift(id: string): void {
    this.deleteCustomShift.emit(id);
  }

  onPlaceWeekly(shift: CustomShift): void {
    this.placeWeekly.emit(shift);
  }

  createCustomShiftDragData(shift: CustomShift): CustomShiftTemplateDragData {
    return { kind: 'custom-shift-template', customShift: shift };
  }

  private resetForm(): void {
    this.formData.set({
      label: '',
      startTime: '09:00',
      endTime: '17:00',
      commuteMinutes: 30,
    });
  }
}
