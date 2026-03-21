import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DEFAULT_SETTINGS, PriorityItem, SchedulerSettings, WorkoutType, WorkoutTime, MealPrepSessions } from '../../core/models/scheduler-settings.model';

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

  toggleWorkoutType(type: WorkoutType, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      if (!this.settings.workoutTypes.includes(type)) {
        this.settings.workoutTypes.push(type);
      }
    } else {
      this.settings.workoutTypes = this.settings.workoutTypes.filter(t => t !== type);
    }
    this.onChanged();
  }

  toggleWorkoutTime(time: WorkoutTime): void {
    if (this.settings.preferredWorkoutTimes.includes(time)) {
      this.settings.preferredWorkoutTimes = this.settings.preferredWorkoutTimes.filter(t => t !== time);
    } else {
      this.settings.preferredWorkoutTimes.push(time);
    }
    this.onChanged();
  }

  setMealPrepSessions(sessions: MealPrepSessions): void {
    this.settings.mealPrepSessionsPerWeek = sessions;
    this.onChanged();
  }
}