import { CdkDragDrop, CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, effect, signal } from '@angular/core';
import { CalendarEvent } from './core/models/calendar-event.model';
import { CustomEvent } from './core/models/custom-event.model';
import { DragData, WorkoutTemplateDragData, isCalendarEvent } from './core/models/drag-data.model';
import { SchedulerSettings } from './core/models/scheduler-settings.model';
import { WorkoutType } from './core/models/workout.model';
import { PlannerService } from './core/services/planner.service';
import { CalendarComponent } from './features/calendar/calendar.component';
import { SchedulerSettingsComponent } from './features/scheduler-settings/scheduler-settings.component';
import { EventDetailsModalComponent } from './shared/components/event-details-modal/event-details-modal.component';
import { QuickAddWorkoutCardComponent } from './features/quick-add-cards/quick-add-workout-card.component';
import { QuickAddWorkEventCardComponent } from './features/quick-add-cards/quick-add-work-event-card.component';
import { QuickAddPersonalEventCardComponent } from './features/quick-add-cards/quick-add-personal-event-card.component';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    CdkDrag,
    CdkDropList,
    CalendarComponent,
    SchedulerSettingsComponent,
    EventDetailsModalComponent,
    QuickAddWorkoutCardComponent,
    QuickAddWorkEventCardComponent,
    QuickAddPersonalEventCardComponent,
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
    'saved-workouts-palette',
  ];

  // View state for tab navigation
  currentView = signal<'daily' | 'week' | 'month'>('daily');

  // Quick add card visibility
  showWorkoutCard = signal(false);
  showWorkEventCard = signal(false);
  showPersonalEventCard = signal(false);

  // Monthly view state
  currentMonthDate = signal<Date>(new Date());

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

  onSettingsChanged(patch: Partial<SchedulerSettings>): void {
    this.planner.updateSettings(patch);
  }

  openSettingsDialog(): void {
    this.showSettingsDialog = true;
  }

  closeSettingsDialog(): void {
    this.showSettingsDialog = false;
  }

  onDayDrop(payload: { day: number; drop: CdkDragDrop<CalendarEvent[]>; startTime?: number }): void {
    const dragData = payload.drop.item.data as DragData;
    const startTimeMinutes = payload.startTime;

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
      const duration = dragData.workout.duration || 60;
      
      // Check if event spans overnight (start day + duration would go into next day)
      if (startTimeMinutes !== undefined) {
        const endTimeMinutes = startTimeMinutes + duration;
        
        if (endTimeMinutes >= 1440) {
          // Event spans overnight - split into two events
          const firstDayDuration = 1440 - startTimeMinutes; // Minutes until midnight
          const secondDayDuration = endTimeMinutes - 1440; // Minutes after midnight
          
          // Create event on current day
          this.planner.addManualEvent(
            payload.day,
            'workout',
            dragData.workout.name,
            firstDayDuration,
            dragData.workout.workoutType,
            dragData.workout.distanceKm,
            dragData.workout.distanceCountsAsLong,
            startTimeMinutes
          );
          
          // Create event on next day
          const nextDay = (payload.day + 1) % 7;
          this.planner.addManualEvent(
            nextDay,
            'workout',
            dragData.workout.name,
            secondDayDuration,
            dragData.workout.workoutType,
            dragData.workout.distanceKm,
            dragData.workout.distanceCountsAsLong,
            0 // Start at midnight
          );
        } else {
          // Event fits within single day
          this.planner.addManualEvent(
            payload.day,
            'workout',
            dragData.workout.name,
            duration,
            dragData.workout.workoutType,
            dragData.workout.distanceKm,
            dragData.workout.distanceCountsAsLong,
            startTimeMinutes
          );
        }
      } else {
        // No start time provided, use default
        this.planner.addManualEvent(
          payload.day,
          'workout',
          dragData.workout.name,
          duration,
          dragData.workout.workoutType,
          dragData.workout.distanceKm,
          dragData.workout.distanceCountsAsLong
        );
      }
      
      // Update frequency if this is a saved workout
      if (dragData.workout.frequencyPerWeek && dragData.workout.frequencyPerWeek > 0) {
        this.planner.decreaseWorkoutFrequency(dragData.workout.id);
      } else {
        // Otherwise, remove from unplaced workouts
        this.planner.removeFirstUnplacedWorkout(dragData.workout.id);
      }
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

  createUnplacedWorkoutDragData(workout: {
    workoutType: WorkoutType;
    name: string;
    duration: number;
    frequencyPerWeek: number;
    distanceKm?: number;
    distanceCountsAsLong?: boolean;
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

  // View switching methods
  showDailyView(): void {
    this.currentView.set('daily');
  }

  showWeekView(): void {
    this.currentView.set('week');
  }

  showMonthView(): void {
    this.currentView.set('month');
  }

  getCurrentWeekLabel(): string {
    const today = new Date();
    const mondayOffset = today.getDay() === 0 ? -6 : 1 - today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + mondayOffset);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const startMonth = weekStart.toLocaleString('default', { month: 'short' });
    const endMonth = weekEnd.toLocaleString('default', { month: 'short' });
    const startDay = weekStart.getDate();
    const endDay = weekEnd.getDate();
    const year = weekEnd.getFullYear();

    if (weekStart.getMonth() === weekEnd.getMonth()) {
      return `${startMonth} ${startDay} - ${endDay}, ${year}`;
    }

    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
  }

  // Daily view helpers
  getTodayIndex(): number {
    const jsDay = new Date().getDay();
    return jsDay === 0 ? 6 : jsDay - 1;
  }

  getTodaysEvents(): CalendarEvent[] {
    const todayIndex = this.getTodayIndex();
    return this.planner.eventsByDay()[todayIndex] || [];
  }

  getCurrentTime(): string {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  getRightNowEvent(): CalendarEvent | null {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const todaysEvents = this.getTodaysEvents();

    // Find event that is currently happening or next event
    return (
      todaysEvents.find((event) => {
        const [startH, startM] = event.startTime.split(':').map(Number);
        const [endH, endM] = event.endTime.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        return startMinutes <= nowMinutes && nowMinutes < endMinutes;
      }) || todaysEvents.find((event) => event.startTime > currentTime) || null
    );
  }

  getEarlierTodayEvents(): CalendarEvent[] {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const todaysEvents = this.getTodaysEvents();

    return todaysEvents.filter((event) => event.endTime <= currentTime);
  }

  getNextUpcomingEvents(): CalendarEvent[] {
    const todayIndex = this.getTodayIndex();
    const eventsByDay = this.planner.eventsByDay();
    const allUpcoming: CalendarEvent[] = [];

    // Get remaining events from today
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const todaysEvents = this.getTodaysEvents().filter((event) => event.startTime >= currentTime);
    allUpcoming.push(...todaysEvents);

    // Get events from next 6 days
    for (let i = 1; i < 7; i++) {
      const dayIndex = (todayIndex + i) % 7;
      const dayEvents = eventsByDay[dayIndex] || [];
      allUpcoming.push(...dayEvents);
    }

    return allUpcoming.slice(0, 6); // Next 6 events
  }

  getWeeklySnapshot(): {
    totalWorkouts: number;
    totalDuration: number;
    placedWorkouts: number;
    unplacedWorkouts: number;
    averagePerDay: number;
  } {
    const eventsByDay = this.planner.eventsByDay();
    let totalDuration = 0;
    let workoutCount = 0;

    eventsByDay.forEach((dayEvents) => {
      dayEvents.forEach((event) => {
        if (event.type === 'workout') {
          const [startH, startM] = event.startTime.split(':').map(Number);
          const [endH, endM] = event.endTime.split(':').map(Number);
          let duration = endH * 60 + endM - (startH * 60 + startM);
          if (duration < 0) duration += 24 * 60;
          totalDuration += duration;
          workoutCount++;
        }
      });
    });

    const unplacedCount = this.planner.unplacedWorkouts().length;

    return {
      totalWorkouts: workoutCount,
      totalDuration,
      placedWorkouts: workoutCount,
      unplacedWorkouts: unplacedCount,
      averagePerDay: workoutCount > 0 ? Math.round(totalDuration / workoutCount) : 0,
    };
  }

  // Monthly view helpers
  getMonthName(): string {
    const date = this.currentMonthDate();
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  getMonthCalendarDays(): (number | null)[] {
    const date = this.currentMonthDate();
    const year = date.getFullYear();
    const month = date.getMonth();

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday, ...
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Create flat array of all days with nulls for empty cells
    const days: (number | null)[] = [];
    
    // Add empty cells before the 1st of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    // Add empty cells after the last day to complete the grid (optional, for visual padding)
    // This ensures the grid is always a multiple of 7 (complete weeks)
    while (days.length % 7 !== 0) {
      days.push(null);
    }

    return days;
  }

  isToday(day: number): boolean {
    const today = new Date();
    const currentDate = this.currentMonthDate();
    return (
      day === today.getDate() &&
      today.getMonth() === currentDate.getMonth() &&
      today.getFullYear() === currentDate.getFullYear()
    );
  }

  previousMonth(): void {
    const current = this.currentMonthDate();
    const prev = new Date(current.getFullYear(), current.getMonth() - 1, 1);
    this.currentMonthDate.set(prev);
  }

  nextMonth(): void {
    const current = this.currentMonthDate();
    const next = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    this.currentMonthDate.set(next);
  }

  // Quick-add card event handlers
  onWorkoutAdded(payload: { type: WorkoutType; sessionName: string; duration: number; timeframe: number; distance?: number }): void {
    this.planner.addWorkout(payload.type, payload.sessionName, payload.duration, payload.timeframe, payload.distance);
    this.showWorkoutCard.set(false);
  }

  onWorkEventAdded(payload: { title: string; startTime: string; endTime: string; commute: number; repeat: number[] }): void {
    // Create a custom work shift and schedule it for the selected days
    const selectedDays = payload.repeat.length > 0 ? payload.repeat : [this.getTodayIndex()];
    selectedDays.forEach((dayIndex) => {
      this.planner.createShiftEvent(payload.title, payload.startTime, payload.endTime, dayIndex, payload.commute);
    });
    this.showWorkEventCard.set(false);
  }

  onPersonalEventAdded(payload: {
    title: string;
    startTime: string;
    endTime: string;
    commute: number;
    repeat: number[];
  }): void {
    // Create custom event for each selected day
    const customEvent: CustomEvent = {
      id: `custom-${Date.now()}`,
      title: payload.title,
      startTime: payload.startTime,
      endTime: payload.endTime,
      commuteMinutes: payload.commute || 0,
      isRepeatingWeekly: payload.repeat.length > 0,
    };

    const selectedDays = payload.repeat.length > 0 ? payload.repeat : [this.getTodayIndex()];
    selectedDays.forEach((dayIndex) => {
      this.planner.addCustomEvent(customEvent, [dayIndex]);
    });
    this.showPersonalEventCard.set(false);
  }

  // Month view event mapping
  getCurrentWeekDates(): { start: Date; end: Date } {
    const today = new Date();
    const jsDay = today.getDay(); // 0 = Sunday
    const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay; // Calculate Monday offset
    
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    return { start: weekStart, end: weekEnd };
  }

  /**
   * Get the weekday index (0=Mon, 6=Sun) for a given calendar date,
   * relative to the current week.
   * Returns -1 if the date is not in the current week.
   */
  getWeekdayIndexForDate(dateOfMonth: number): number {
    const currentMonth = this.currentMonthDate();
    const targetDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dateOfMonth);
    const { start: weekStart, end: weekEnd } = this.getCurrentWeekDates();
    
    // Check if target date is within current week
    if (targetDate >= weekStart && targetDate <= weekEnd) {
      const jsDay = targetDate.getDay(); // 0 = Sunday
      return jsDay === 0 ? 6 : jsDay - 1; // Convert to our format (0=Mon, 6=Sun)
    }
    
    return -1;
  }

  /**
   * Get all events for a specific calendar date in the month view
   */
  getEventsForMonthDay(dateOfMonth: number): CalendarEvent[] {
    const weekdayIndex = this.getWeekdayIndexForDate(dateOfMonth);
    if (weekdayIndex === -1) {
      return [];
    }
    
    return this.planner.eventsByDay()[weekdayIndex] || [];
  }

  /**
   * Check if a specific calendar date has any events
   */
  hasEventsOnMonthDay(dateOfMonth: number): boolean {
    return this.getEventsForMonthDay(dateOfMonth).length > 0;
  }

  /**
   * Get event type counts for a specific calendar date
   */
  getEventTypeCountsForMonthDay(dateOfMonth: number): {
    shifts: number;
    workouts: number;
    mealpreps: number;
    custom: number;
  } {
    const events = this.getEventsForMonthDay(dateOfMonth);
    return {
      shifts: events.filter(e => e.type === 'shift').length,
      workouts: events.filter(e => e.type === 'workout').length,
      mealpreps: events.filter(e => e.type === 'mealprep').length,
      custom: events.filter(e => e.type === 'custom-event').length,
    };
  }
}