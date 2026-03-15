import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component } from '@angular/core';
import { CalendarEvent } from './core/models/calendar-event.model';
import { DragData, isCalendarEvent } from './core/models/drag-data.model';
import { MealPrep } from './core/models/mealprep.model';
import { SchedulerSettings } from './core/models/scheduler-settings.model';
import { ShiftType } from './core/models/shift.model';
import { WorkoutType } from './core/models/workout.model';
import { PlannerService } from './core/services/planner.service';
import { CalendarComponent } from './features/calendar/calendar.component';
import { MealPrepManagerComponent } from './features/mealprep-manager/mealprep-manager.component';
import { SchedulerSettingsComponent } from './features/scheduler-settings/scheduler-settings.component';
import { ShiftSelectorComponent } from './features/shift-selector/shift-selector.component';
import { WorkoutManagerComponent } from './features/workout-manager/workout-manager.component';

@Component({
  selector: 'app-root',
  imports: [
    CalendarComponent,
    ShiftSelectorComponent,
    WorkoutManagerComponent,
    MealPrepManagerComponent,
    SchedulerSettingsComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  readonly dayDropListIds = this.dayLabels.map((_, index) => `day-${index}`);
  readonly connectedDropListIds = [
    ...this.dayDropListIds,
    'shift-palette',
    'workout-palette',
    'mealprep-palette',
  ];

  constructor(readonly planner: PlannerService) {}

  onQuickAddShift(shiftType: ShiftType): void {
    this.planner.addShift(0, shiftType);
  }

  onAddWorkout(payload: {
    workoutType: WorkoutType;
    name: string;
    duration: number;
    frequencyPerWeek: number;
    distanceKm: number | undefined;
  }): void {
    this.planner.addWorkout(
      payload.workoutType,
      payload.name,
      payload.duration,
      payload.frequencyPerWeek,
      payload.distanceKm,
    );
  }

  onDeleteWorkout(id: string): void {
    this.planner.removeWorkout(id);
  }

  onMealPrepChanged(config: MealPrep): void {
    this.planner.setMealPrep({ ...config });
  }

  onSettingsChanged(patch: Partial<SchedulerSettings>): void {
    this.planner.updateSettings(patch);
  }

  onDayDrop(payload: { day: number; drop: CdkDragDrop<CalendarEvent[]> }): void {
    const dragData = payload.drop.item.data as DragData;

    if (isCalendarEvent(dragData)) {
      this.planner.moveEvent(dragData.id, payload.day);
      return;
    }

    if (dragData.kind === 'shift-template') {
      this.planner.addShift(payload.day, dragData.shiftType);
      return;
    }

    if (dragData.kind === 'workout-template') {
      this.planner.addManualEvent(
        payload.day,
        'workout',
        dragData.workout.name,
        dragData.workout.duration,
      );
      return;
    }

    this.planner.addManualEvent(payload.day, 'mealprep', 'Meal Prep', dragData.duration);
  }
}