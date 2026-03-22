import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal, effect } from '@angular/core';
import { Workout, WorkoutType, WORKOUT_TYPE_LABELS } from '../../core/models/workout.model';

export interface WorkoutEditDraft {
  name: string;
  workoutType: WorkoutType;
  duration: number;
  frequencyPerWeek: number;
  distanceKm: number | undefined;
  notes: string;
}

export interface WorkoutSavePayload {
  workoutId: string;
  draft: WorkoutEditDraft;
  addAsPreset: boolean;
}

/**
 * Component for editing workout templates.
 * Single Responsibility: Handle workout template editing UI and state.
 */
@Component({
  selector: 'app-workout-template-editor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './workout-template-editor.component.html',
  styleUrl: './workout-template-editor.component.scss',
})
export class WorkoutTemplateEditorComponent {
  @Input() set workout(value: Workout | null) {
    if (value) {
      this.workoutEditDraft.set({
        name: value.name,
        workoutType: value.workoutType,
        duration: value.duration,
        frequencyPerWeek: value.frequencyPerWeek,
        distanceKm: value.distanceKm,
        notes: value.notes || '',
      });
      this._workout = value;
    } else {
      this._workout = null;
    }
  }

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<WorkoutSavePayload>();
  @Output() deleted = new EventEmitter<string>();

  private _workout: Workout | null = null;

  workoutEditDraft = signal<WorkoutEditDraft>({
    name: '',
    workoutType: 'running',
    duration: 45,
    frequencyPerWeek: 1,
    distanceKm: undefined,
    notes: '',
  });

  addAsPreset = signal(false);

  readonly workoutTypeOptions: Array<{ value: WorkoutType; label: string }> = [
    { value: 'running', label: WORKOUT_TYPE_LABELS.running },
    { value: 'swimming', label: WORKOUT_TYPE_LABELS.swimming },
    { value: 'biking', label: WORKOUT_TYPE_LABELS.biking },
    { value: 'strength', label: WORKOUT_TYPE_LABELS.strength },
    { value: 'yoga', label: WORKOUT_TYPE_LABELS.yoga },
  ];

  constructor() {
    // Manage body overflow
    effect(() => {
      if (this._workout) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });
  }

  get isOpen(): boolean {
    return this._workout !== null;
  }

  updateField(field: keyof WorkoutEditDraft, value: string | number | undefined): void {
    this.workoutEditDraft.update((current) => ({
      ...current,
      [field]: value,
    }));
  }

  save(): void {
    if (!this._workout) return;

    const draft = this.workoutEditDraft();
    if (!draft.name.trim() || draft.duration <= 0 || draft.frequencyPerWeek <= 0) {
      return;
    }

    this.saved.emit({
      workoutId: this._workout.id,
      draft,
      addAsPreset: this.addAsPreset(),
    });
  }

  delete(): void {
    if (!this._workout) return;
    this.deleted.emit(this._workout.id);
  }

  close(): void {
    this.addAsPreset.set(false);
    this.closed.emit();
  }

  onOverlayClick(): void {
    this.close();
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }
}
