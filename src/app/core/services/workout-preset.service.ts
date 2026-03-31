import { Injectable, signal } from '@angular/core';
import { WorkoutPreset } from '../models/workout-preset.model';
import { WorkoutType } from '../models/workout.model';

const WORKOUT_PRESETS_STORAGE_KEY = 'week-planner-workout-presets';

@Injectable({
  providedIn: 'root',
})
export class WorkoutPresetService {
  readonly presets = signal<WorkoutPreset[]>(this.loadFromStorage());

  private loadFromStorage(): WorkoutPreset[] {
    try {
      const raw = localStorage.getItem(WORKOUT_PRESETS_STORAGE_KEY);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw) as WorkoutPreset[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  save(preset: Omit<WorkoutPreset, 'id'>): void {
    const nextPresets = [
      ...this.presets(),
      {
        id: crypto.randomUUID(),
        name: preset.name.trim(),
        workoutType: preset.workoutType,
        duration: preset.duration,
        distanceKm: preset.distanceKm,
        notes: preset.notes,
      },
    ];

    this.persist(nextPresets);
  }

  update(payload: {
    id: string;
    name: string;
    workoutType: WorkoutType;
    duration: number;
    distanceKm?: number;
    notes?: string;
  }): void {
    const nextPresets = this.presets().map((preset) =>
      preset.id === payload.id
        ? {
            ...preset,
            name: payload.name,
            workoutType: payload.workoutType,
            duration: payload.duration,
            distanceKm: payload.distanceKm,
            notes: payload.notes,
          }
        : preset,
    );

    this.persist(nextPresets);
  }

  delete(presetId: string): void {
    const nextPresets = this.presets().filter((preset) => preset.id !== presetId);
    this.persist(nextPresets);
  }

  getById(presetId: string): WorkoutPreset | undefined {
    return this.presets().find((item) => item.id === presetId);
  }

  private persist(nextPresets: WorkoutPreset[]): void {
    this.presets.set(nextPresets);

    try {
      localStorage.setItem(WORKOUT_PRESETS_STORAGE_KEY, JSON.stringify(nextPresets));
    } catch {
      // Ignore storage failures and keep the in-memory presets available for the session.
    }
  }
}
