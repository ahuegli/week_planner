import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WorkoutTemplateDragData } from '../../core/models/drag-data.model';
import { DEFAULT_SETTINGS, SchedulerSettings } from '../../core/models/scheduler-settings.model';
import {
  WORKOUT_TYPE_LABELS,
  Workout,
  WorkoutType,
  isEnduranceType,
} from '../../core/models/workout.model';

@Component({
  selector: 'app-workout-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, CdkDropList, CdkDrag],
  templateUrl: './workout-manager.component.html',
  styleUrl: './workout-manager.component.scss',
})
export class WorkoutManagerComponent {
  @Input() workouts: Workout[] = [];
  @Input() dayDropListIds: string[] = [];
  @Input() settings: SchedulerSettings = { ...DEFAULT_SETTINGS };
  @Output() addWorkout = new EventEmitter<{
    workoutType: WorkoutType;
    name: string;
    duration: number;
    frequencyPerWeek: number;
    distanceKm: number | undefined;
    distanceCountsAsLong: boolean | undefined;
  }>();
  @Output() deleteWorkout = new EventEmitter<string>();

  readonly workoutTypeOptions: { value: WorkoutType; label: string }[] = [
    { value: 'swimming', label: WORKOUT_TYPE_LABELS.swimming },
    { value: 'running', label: WORKOUT_TYPE_LABELS.running },
    { value: 'biking', label: WORKOUT_TYPE_LABELS.biking },
    { value: 'strength', label: WORKOUT_TYPE_LABELS.strength },
    { value: 'yoga', label: WORKOUT_TYPE_LABELS.yoga },
  ];

  showForm = signal(false);
  formData = signal({
    workoutType: 'running' as WorkoutType,
    name: '',
    duration: 45,
    frequencyPerWeek: 3,
    distanceKm: undefined as number | undefined,
  });

  get isEndurance(): boolean {
    return isEnduranceType(this.formData().workoutType);
  }

  onToggleForm(): void {
    this.showForm.update((v) => !v);
    if (!this.showForm()) {
      this.resetForm();
    }
  }

  onTypeChange(): void {
    if (!this.isEndurance) {
      this.formData.update((current) => ({ ...current, distanceKm: undefined }));
    }
  }

  onAddWorkout(): void {
    const data = this.formData();
    if (!data.name.trim() || data.duration <= 0 || data.frequencyPerWeek <= 0) {
      alert('Please fill in all required fields');
      return;
    }

    let distanceCountsAsLong: boolean | undefined = undefined;
    if (this.isEndurance && data.distanceKm !== undefined) {
      const threshold = this.settings.enduranceThresholds[data.workoutType as 'running' | 'biking' | 'swimming'];
      const distanceExceeds = data.distanceKm >= threshold.distanceKm;
      const durationExceeds = data.duration >= threshold.durationMin;

      if (distanceExceeds && !durationExceeds) {
        const useDistanceForRest = confirm(
          'Distance exceeds the long-session threshold while duration does not. Treat this as a long session and apply rest-day logic?',
        );
        distanceCountsAsLong = useDistanceForRest;
      }
    }

    this.addWorkout.emit({
      workoutType: data.workoutType,
      name: data.name.trim(),
      duration: data.duration,
      frequencyPerWeek: data.frequencyPerWeek,
      distanceKm: this.isEndurance ? data.distanceKm : undefined,
      distanceCountsAsLong,
    });

    this.resetForm();
    this.showForm.set(false);
  }

  onDeleteWorkout(id: string): void {
    this.deleteWorkout.emit(id);
  }

  createDragData(workout: Workout): WorkoutTemplateDragData {
    return { kind: 'workout-template', workout };
  }

  private resetForm(): void {
    this.formData.set({
      workoutType: 'running',
      name: '',
      duration: 45,
      frequencyPerWeek: 3,
      distanceKm: undefined,
    });
  }
}