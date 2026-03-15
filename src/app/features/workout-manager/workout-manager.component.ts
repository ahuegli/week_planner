import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WorkoutTemplateDragData } from '../../core/models/drag-data.model';
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
  @Output() addWorkout = new EventEmitter<{
    workoutType: WorkoutType;
    name: string;
    duration: number;
    frequencyPerWeek: number;
    distanceKm: number | undefined;
  }>();
  @Output() deleteWorkout = new EventEmitter<string>();

  readonly workoutTypeOptions: { value: WorkoutType; label: string }[] = [
    { value: 'swimming', label: WORKOUT_TYPE_LABELS.swimming },
    { value: 'running', label: WORKOUT_TYPE_LABELS.running },
    { value: 'biking', label: WORKOUT_TYPE_LABELS.biking },
    { value: 'strength', label: WORKOUT_TYPE_LABELS.strength },
    { value: 'yoga', label: WORKOUT_TYPE_LABELS.yoga },
  ];

  workoutType: WorkoutType = 'running';
  name = '';
  duration = 45;
  frequencyPerWeek = 3;
  distanceKm: number | undefined;

  get isEndurance(): boolean {
    return isEnduranceType(this.workoutType);
  }

  onTypeChange(): void {
    if (!this.isEndurance) {
      this.distanceKm = undefined;
    }
  }

  onAddWorkout(): void {
    if (!this.name.trim() || this.duration <= 0 || this.frequencyPerWeek <= 0) return;

    this.addWorkout.emit({
      workoutType: this.workoutType,
      name: this.name.trim(),
      duration: this.duration,
      frequencyPerWeek: this.frequencyPerWeek,
      distanceKm: this.isEndurance ? this.distanceKm : undefined,
    });

    this.name = '';
    this.duration = 45;
    this.frequencyPerWeek = 3;
    this.distanceKm = undefined;
  }

  onDeleteWorkout(id: string): void {
    this.deleteWorkout.emit(id);
  }

  createDragData(workout: Workout): WorkoutTemplateDragData {
    return { kind: 'workout-template', workout };
  }
}