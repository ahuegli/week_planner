import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ShiftTemplateDragData } from '../../core/models/drag-data.model';
import { ShiftType } from '../../core/models/shift.model';

@Component({
  selector: 'app-shift-selector',
  standalone: true,
  imports: [CommonModule, CdkDropList, CdkDrag],
  templateUrl: './shift-selector.component.html',
  styleUrl: './shift-selector.component.scss',
})
export class ShiftSelectorComponent {
  @Input() dayDropListIds: string[] = [];
  @Output() quickAddShift = new EventEmitter<ShiftType>();

  readonly shiftOptions: Array<{ label: string; type: ShiftType; time: string }> = [
    { label: 'Early', type: 'early', time: '06:00-14:00' },
    { label: 'Late', type: 'late', time: '14:00-22:00' },
    { label: 'Night', type: 'night', time: '22:00-06:00' },
  ];

  createDragData(type: ShiftType): ShiftTemplateDragData {
    return { kind: 'shift-template', shiftType: type };
  }
}
