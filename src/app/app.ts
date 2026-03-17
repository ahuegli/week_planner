import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, effect, signal } from '@angular/core';
import { CalendarEvent } from './core/models/calendar-event.model';
import { CustomEvent } from './core/models/custom-event.model';
import { CustomShift } from './core/models/custom-shift.model';
import { DragData, WorkoutTemplateDragData, isCalendarEvent } from './core/models/drag-data.model';
import { SchedulerSettings } from './core/models/scheduler-settings.model';
import { WorkoutType } from './core/models/workout.model';
import { PlannerService } from './core/services/planner.service';
import { CalendarComponent } from './features/calendar/calendar.component';
import { CustomEventsManagerComponent } from './features/custom-events-manager/custom-events-manager.component';
import { MealPrepManagerComponent } from './features/mealprep-manager/mealprep-manager.component';
import { SchedulerSettingsComponent } from './features/scheduler-settings/scheduler-settings.component';
import { ShiftSelectorComponent } from './features/shift-selector/shift-selector.component';
import { WorkoutManagerComponent } from './features/workout-manager/workout-manager.component';
import { EventDetailsModalComponent } from './shared/components/event-details-modal/event-details-modal.component';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    CdkDropList,
    CdkDrag,
    CalendarComponent,
    ShiftSelectorComponent,
    CustomEventsManagerComponent,
    WorkoutManagerComponent,
    MealPrepManagerComponent,
    SchedulerSettingsComponent,
    EventDetailsModalComponent,
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
    'custom-event-palette',
    'workout-palette',
    'mealprep-palette',
    'unplaced-workout-palette',
  ];

  showSettingsDialog = false;
  selectedEvent = signal<CalendarEvent | null>(null);
  showEventModal = signal(false);
  selectedConflictIds = signal<Set<string>>(new Set());

  constructor(readonly planner: PlannerService) {
    effect(() => {
      if (this.showSettingsDialog || this.showEventModal()) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });

    effect(() => {
      const proposal = this.planner.optimizationProposal();
      if (!proposal) {
        this.selectedConflictIds.set(new Set());
        return;
      }

      this.selectedConflictIds.set(new Set(proposal.conflictEvents.map((event) => event.id)));
    });
  }

  onAddWorkout(payload: {
    workoutType: WorkoutType;
    name: string;
    duration: number;
    frequencyPerWeek: number;
    distanceKm: number | undefined;
    distanceCountsAsLong: boolean | undefined;
  }): void {
    this.planner.addWorkout(
      payload.workoutType,
      payload.name,
      payload.duration,
      payload.frequencyPerWeek,
      payload.distanceKm,
      payload.distanceCountsAsLong,
    );
  }

  onDeleteWorkout(id: string): void {
    this.planner.removeWorkout(id);
  }

  onAddMealPrepSession(payload: { name: string; duration: number; frequencyPerWeek: number; daysPreppedFor: number }): void {
    this.planner.addMealPrepSession(payload.name, payload.duration, payload.frequencyPerWeek, payload.daysPreppedFor);
  }

  onDeleteMealPrepSession(id: string): void {
    this.planner.removeMealPrepSession(id);
  }

  onSettingsChanged(patch: Partial<SchedulerSettings>): void {
    this.planner.updateSettings(patch);
  }

  openSettingsDialog(): void {
    this.showSettingsDialog = true;
  }

  closeSettingsDialog(): void {
    this.showSettingsDialog = false;
  }

  onDayDrop(payload: { day: number; drop: CdkDragDrop<CalendarEvent[]> }): void {
    const dragData = payload.drop.item.data as DragData;

    if (isCalendarEvent(dragData)) {
      this.planner.moveEvent(dragData.id, payload.day);
      return;
    }

    if (dragData.kind === 'custom-shift-template') {
      const shift = dragData.customShift;
      this.planner.createShiftEvent(shift.label, shift.startTime, shift.endTime, payload.day, shift.commuteMinutes);
      return;
    }

    if (dragData.kind === 'custom-event-template') {
      this.planner.addCustomEvent(dragData.customEvent, [payload.day]);
      return;
    }

    if (dragData.kind === 'workout-template') {
      this.planner.addManualEvent(
        payload.day,
        'workout',
        dragData.workout.name,
        dragData.workout.duration,
        dragData.workout.workoutType,
        dragData.workout.distanceKm,
        dragData.workout.distanceCountsAsLong,
      );
      this.planner.removeFirstUnplacedWorkout(dragData.workout.id);
      return;
    }

    this.planner.addManualEvent(payload.day, 'mealprep', 'Meal Prep', dragData.duration);
  }

  onAddCustomEvent(payload: { customEvent: CustomEvent; days: number[] }): void {
    this.planner.addCustomEvent(payload.customEvent, payload.days);
  }

  onDeleteCustomEvent(id: string): void {
    this.planner.deleteCustomEvent(id);
  }

  onEventSelected(event: CalendarEvent): void {
    this.selectedEvent.set(event);
    this.showEventModal.set(true);
  }

  onEventModalClose(): void {
    this.showEventModal.set(false);
    this.selectedEvent.set(null);
  }

  onEventUpdated(event: CalendarEvent): void {
    this.planner.updateEvent(event);
    this.showEventModal.set(false);
    this.selectedEvent.set(null);
  }

  onUpdateCommuteForDay(payload: { eventId: string; commuteMinutes: number }): void {
    this.planner.updateEventCommute(payload.eventId, payload.commuteMinutes);
    this.showEventModal.set(false);
    this.selectedEvent.set(null);
  }

  onUpdateCommuteForAllShifts(payload: { shiftLabel: string; shiftStartTime: string; commuteMinutes: number }): void {
    this.planner.updateEventCommuteByShift(payload.shiftLabel, payload.shiftStartTime, payload.commuteMinutes);
    this.showEventModal.set(false);
    this.selectedEvent.set(null);
  }

  onAddCustomShift(shift: CustomShift): void {
    this.planner.addCustomShiftDefinition(shift);
  }

  onUpdateCustomShift(payload: { id: string; shift: CustomShift }): void {
    this.planner.updateCustomShift(payload.id, payload.shift);
  }

  onDeleteCustomShift(id: string): void {
    this.planner.deleteCustomShift(id);
  }

  onPlaceShiftWeekly(shift: CustomShift): void {
    // Place the shift from Monday (0) to Friday (4)
    for (let day = 0; day < 5; day++) {
      this.planner.createShiftEvent(shift.label, shift.startTime, shift.endTime, day, shift.commuteMinutes);
    }
  }

  createUnplacedWorkoutDragData(workout: {
    workoutType: WorkoutType;
    name: string;
    duration: number;
    frequencyPerWeek: number;
    distanceKm?: number;
    id: string;
  }): WorkoutTemplateDragData {
    return {
      kind: 'workout-template',
      workout,
    };
  }

  toggleConflictSelection(eventId: string, checked: boolean): void {
    const next = new Set(this.selectedConflictIds());
    if (checked) {
      next.add(eventId);
    } else {
      next.delete(eventId);
    }
    this.selectedConflictIds.set(next);
  }

  isConflictSelected(eventId: string): boolean {
    return this.selectedConflictIds().has(eventId);
  }

  keepAllConflicts(): void {
    this.selectedConflictIds.set(new Set());
  }

  acceptAllConflicts(): void {
    const proposal = this.planner.optimizationProposal();
    if (!proposal) {
      return;
    }
    this.selectedConflictIds.set(new Set(proposal.conflictEvents.map((event) => event.id)));
  }

  applyConflictSelection(): void {
    this.planner.applyOptimizationSelection(Array.from(this.selectedConflictIds()));
  }

  cancelOptimizationProposal(): void {
    this.planner.clearOptimizationProposal();
  }

  getConflictGainLabel(eventId: string): string {
    const proposal = this.planner.optimizationProposal();
    if (!proposal) {
      return '';
    }

    const gain = proposal.conflictGains[eventId];
    if (!gain) {
      return 'No measurable solo gain';
    }

    const workoutDelta = gain.placedWorkoutDelta;
    const weightedDelta = gain.weightedDelta;

    if (workoutDelta > 0) {
      return `Estimated solo gain: +${workoutDelta} placed workout${workoutDelta > 1 ? 's' : ''}`;
    }

    if (weightedDelta > 0) {
      return `Estimated solo gain: improves workout quality (+${weightedDelta})`;
    }

    return 'Primarily helps as part of a combined reschedule';
  }
}