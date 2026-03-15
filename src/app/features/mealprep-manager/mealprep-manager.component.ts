import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MealPrepTemplateDragData } from '../../core/models/drag-data.model';
import { MealPrep } from '../../core/models/mealprep.model';

@Component({
  selector: 'app-mealprep-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, CdkDropList, CdkDrag],
  templateUrl: './mealprep-manager.component.html',
  styleUrl: './mealprep-manager.component.scss',
})
export class MealPrepManagerComponent {
  @Input() mealPrep: MealPrep = { duration: 90, sessionsPerWeek: 2, minDaysBetweenSessions: 1 };
  @Input() dayDropListIds: string[] = [];
  @Output() mealPrepChanged = new EventEmitter<MealPrep>();

  onConfigChanged(): void {
    this.mealPrepChanged.emit(this.mealPrep);
  }

  createDragData(duration: number): MealPrepTemplateDragData {
    return { kind: 'mealprep-template', duration };
  }
}
