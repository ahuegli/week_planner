import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WorkoutTemplateDragData } from '../../core/models/drag-data.model';
import { Workout } from '../../core/models/workout.model';

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
    name: string;
    duration: number;
    frequencyPerWeek: number;
  }>();

  name = 'Running';
  duration = 45;
  frequencyPerWeek = 3;

  onAddWorkout(): void {
    if (!this.name.trim() || this.duration <= 0 || this.frequencyPerWeek <= 0) {
      return;
    }

    this.addWorkout.emit({
      name: this.name.trim(),
      duration: this.duration,
      frequencyPerWeek: this.frequencyPerWeek,
    });
    this.name = '';
  }

  createDragData(workout: Workout): WorkoutTemplateDragData {
    return { kind: 'workout-template', workout };
  }
}
