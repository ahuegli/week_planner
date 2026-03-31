import { inject, Injectable } from '@angular/core';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { CalendarEvent } from '../models/calendar-event.model';
import { DragData, WorkoutTemplateDragData, isCalendarEvent } from '../models/drag-data.model';
import { PlannerService } from './planner.service';

export interface DayDropPayload {
  day: number;
  drop: CdkDragDrop<CalendarEvent[]>;
  startTime?: number;
  weekOffset: number;
}

@Injectable({ providedIn: 'root' })
export class DragDropService {
  private readonly planner = inject(PlannerService);

  handleDayDrop(payload: DayDropPayload): void {
    const dragData = payload.drop.item.data as DragData;
    const startTimeMinutes = payload.startTime;
    const weekOffset = payload.weekOffset;

    if (isCalendarEvent(dragData)) {
      this.planner.moveEvent(dragData.id, payload.day);
      return;
    }

    if (dragData.kind === 'custom-shift-template') {
      const shift = dragData.customShift;
      this.planner.createShiftEvent(
        shift.label,
        shift.startTime,
        shift.endTime,
        payload.day,
        shift.commuteMinutes,
        weekOffset,
      );
      return;
    }

    if (dragData.kind === 'custom-event-template') {
      const customEventWeekOffset = dragData.customEvent.isRepeatingWeekly ? undefined : weekOffset;
      this.planner.addCustomEvent(dragData.customEvent, [payload.day], customEventWeekOffset);
      return;
    }

    if (dragData.kind === 'workout-template') {
      this.handleWorkoutDrop(payload.day, dragData, startTimeMinutes, weekOffset);
      return;
    }

    // Default: meal prep
    this.planner.addManualEvent(
      payload.day,
      'mealprep',
      'Meal Prep',
      dragData.duration,
      undefined,
      undefined,
      undefined,
      undefined,
      weekOffset,
    );
  }

  private handleWorkoutDrop(
    day: number,
    dragData: WorkoutTemplateDragData,
    startTimeMinutes: number | undefined,
    weekOffset: number,
  ): void {
    const duration = dragData.workout.duration || 60;

    if (startTimeMinutes !== undefined) {
      const endTimeMinutes = startTimeMinutes + duration;

      if (endTimeMinutes >= 1440) {
        // Event spans overnight - split into two events
        const firstDayDuration = 1440 - startTimeMinutes;
        const secondDayDuration = endTimeMinutes - 1440;

        this.planner.addManualEvent(
          day,
          'workout',
          dragData.workout.name,
          firstDayDuration,
          dragData.workout.workoutType,
          dragData.workout.distanceKm,
          dragData.workout.distanceCountsAsLong,
          startTimeMinutes,
          weekOffset,
          dragData.workout.notes,
        );

        const nextDay = (day + 1) % 7;
        this.planner.addManualEvent(
          nextDay,
          'workout',
          dragData.workout.name,
          secondDayDuration,
          dragData.workout.workoutType,
          dragData.workout.distanceKm,
          dragData.workout.distanceCountsAsLong,
          0,
          weekOffset,
          dragData.workout.notes,
        );
      } else {
        this.planner.addManualEvent(
          day,
          'workout',
          dragData.workout.name,
          duration,
          dragData.workout.workoutType,
          dragData.workout.distanceKm,
          dragData.workout.distanceCountsAsLong,
          startTimeMinutes,
          weekOffset,
          dragData.workout.notes,
        );
      }
    } else {
      this.planner.addManualEvent(
        day,
        'workout',
        dragData.workout.name,
        duration,
        dragData.workout.workoutType,
        dragData.workout.distanceKm,
        dragData.workout.distanceCountsAsLong,
        undefined,
        weekOffset,
        dragData.workout.notes,
      );
    }

    // Update frequency or remove from unplaced
    if (dragData.workout.frequencyPerWeek && dragData.workout.frequencyPerWeek > 0) {
      this.planner.decreaseWorkoutFrequency(dragData.workout.id);
    } else {
      this.planner.removeFirstUnplacedWorkout(dragData.workout.id);
    }
  }

  createWorkoutDragData(workout: {
    workoutType: string;
    name: string;
    duration: number;
    frequencyPerWeek: number;
    distanceKm?: number;
    distanceCountsAsLong?: boolean;
    id: string;
    notes?: string;
  }): WorkoutTemplateDragData {
    return {
      kind: 'workout-template',
      workout: workout as any,
    };
  }
}
