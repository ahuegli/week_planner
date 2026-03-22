import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkoutType, ENDURANCE_TYPES } from '../../core/models/workout.model';

@Component({
  selector: 'app-quick-add-workout-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quick-add-workout-card.component.html',
  styleUrl: './quick-add-workout-card.component.scss',
})
export class QuickAddWorkoutCardComponent {
  @Output() workoutAdded = new EventEmitter<{
    type: WorkoutType;
    sessionName: string;
    duration: number;
    timeframe: number;
    distance?: number;
  }>();

  @Output() closed = new EventEmitter<void>();

  // Use individual signals for better reactivity with ngModel
  type = signal<WorkoutType>('running');
  sessionName = signal('');
  duration = signal(45);
  timeframe = signal(1);
  distance = signal<number | undefined>(undefined);

  // Must match the order and count matching to the actual WorkoutType
  workoutTypes: { label: string; value: WorkoutType }[] = [
    { label: 'Running', value: 'running' },
    { label: 'Swimming', value: 'swimming' },
    { label: 'Biking', value: 'biking' },
    { label: 'Strength', value: 'strength' },
    { label: 'Yoga', value: 'yoga' },
  ];

  timeframeOptions = [
    { label: 'Once', value: 1 },
    { label: '2x/week', value: 2 },
    { label: '3x/week', value: 3 },
    { label: '4x/week', value: 4 },
    { label: '5x/week', value: 5 },
  ];

  isEnduranceType(): boolean {
    return ENDURANCE_TYPES.includes(this.type());
  }

  onAdd(): void {
    if (this.sessionName().trim()) {
      this.workoutAdded.emit({
        type: this.type(),
        sessionName: this.sessionName(),
        duration: this.duration(),
        timeframe: this.timeframe(),
        distance: this.distance(),
      });
      this.resetForm();
    }
  }

  onCancel(): void {
    this.resetForm();
    this.closed.emit();
  }

  private resetForm(): void {
    this.type.set('running');
    this.sessionName.set('');
    this.duration.set(45);
    this.timeframe.set(1);
    this.distance.set(undefined);
  }
}
