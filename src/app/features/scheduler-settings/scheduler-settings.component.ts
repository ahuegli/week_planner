import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DEFAULT_SETTINGS, PriorityItem, SchedulerSettings } from '../../core/models/scheduler-settings.model';

@Component({
  selector: 'app-scheduler-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, CdkDropList, CdkDrag, CdkDragHandle],
  templateUrl: './scheduler-settings.component.html',
  styleUrl: './scheduler-settings.component.scss',
})
export class SchedulerSettingsComponent {
  @Input() settings: SchedulerSettings = { ...DEFAULT_SETTINGS };
  @Output() settingsChanged = new EventEmitter<Partial<SchedulerSettings>>();

  readonly priorityLabels: Record<PriorityItem, string> = {
    sport: 'Sport / Workouts',
    recovery: 'Recovery',
    mealprep: 'Meal Prep',
  };

  onChanged(): void {
    this.settingsChanged.emit({ ...this.settings });
  }

  onPriorityDrop(event: CdkDragDrop<PriorityItem[]>): void {
    moveItemInArray(
      this.settings.priorityHierarchy,
      event.previousIndex,
      event.currentIndex,
    );
    this.onChanged();
  }
}