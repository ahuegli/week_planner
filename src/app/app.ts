import { CdkDragDrop, CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CalendarEvent } from './core/models/calendar-event.model';
import { CustomEvent } from './core/models/custom-event.model';
import { SchedulerSettings } from './core/models/scheduler-settings.model';
import { WorkoutType } from './core/models/workout.model';
import { PlannerService } from './core/services/planner.service';
import { AuthService } from './core/services/auth.service';
import { WorkoutSchedulerService } from './core/services/workout-scheduler.service';
import { WorkoutPresetService } from './core/services/workout-preset.service';
import { WeekNavigationService } from './core/services/week-navigation.service';
import { DialogStateService, QuickAddTargetContext } from './core/services/dialog-state.service';
import { DragDropService } from './core/services/drag-drop.service';
import { CalendarComponent } from './features/calendar/calendar.component';
import { DailyViewComponent } from './features/daily-view/daily-view.component';
import { MonthViewComponent, QuickAddRequest } from './features/month-view/month-view.component';
import { OnboardingComponent } from './features/onboarding/onboarding.component';
import { SchedulerSettingsComponent } from './features/scheduler-settings/scheduler-settings.component';
import { LoginComponent } from './features/login/login.component';
import {
  WorkoutTemplateEditorComponent,
  WorkoutSavePayload,
} from './features/workout-template-editor/workout-template-editor.component';
import { EventDetailsModalComponent } from './shared/components/event-details-modal/event-details-modal.component';
import { ConnectionBannerComponent } from './shared/components/connection-banner/connection-banner.component';
import { QuickAddWorkoutCardComponent } from './features/quick-add-cards/quick-add-workout-card.component';
import { QuickAddWorkShiftCardComponent } from './features/quick-add-cards/quick-add-work-event-card.component';
import { QuickAddPersonalEventCardComponent } from './features/quick-add-cards/quick-add-personal-event-card.component';
import { QuickAddMealPrepCardComponent } from './features/quick-add-cards/quick-add-mealprep-card.component';

type WorkoutQuickAddPayload =
  | {
      kind: 'new';
      type: WorkoutType;
      sessionName: string;
      duration: number;
      timeframe: number;
      distance?: number;
      notes?: string;
      saveAsPreset: boolean;
    }
  | {
      kind: 'preset';
      presetId: string;
      timeframe: number;
      notes?: string;
    }
  | {
      kind: 'new-planned';
      day: number;
      weekOffset: number;
      startTime: string;
      type: WorkoutType;
      sessionName: string;
      duration: number;
      distance?: number;
      notes?: string;
      saveAsPreset: boolean;
    }
  | {
      kind: 'preset-planned';
      day: number;
      weekOffset: number;
      startTime: string;
      presetId: string;
      notes?: string;
    };

interface MealPrepQuickAddPayload {
  day: number;
  weekOffset: number;
  startTime: string;
  duration: number;
  title: string;
}

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    CdkDrag,
    CdkDropList,
    CalendarComponent,
    DailyViewComponent,
    MonthViewComponent,
    OnboardingComponent,
    SchedulerSettingsComponent,
    LoginComponent,
    WorkoutTemplateEditorComponent,
    EventDetailsModalComponent,
    ConnectionBannerComponent,
    QuickAddWorkoutCardComponent,
    QuickAddWorkShiftCardComponent,
    QuickAddPersonalEventCardComponent,
    QuickAddMealPrepCardComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly workoutScheduler = inject(WorkoutSchedulerService);

  readonly planner = inject(PlannerService);
  readonly nav = inject(WeekNavigationService);
  readonly dialogs = inject(DialogStateService);
  readonly presets = inject(WorkoutPresetService);
  readonly dragDrop = inject(DragDropService);

  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly currentUser = this.authService.user;
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

  // Expose navigation signals for template (delegated to nav service)
  readonly currentView = this.nav.currentView;
  readonly currentWeekOffset = this.nav.currentWeekOffset;
  readonly currentMonthDate = this.nav.currentMonthDate;

  // Expose dialog signals for template (delegated to dialog service)
  readonly showWorkoutCard = this.dialogs.showWorkoutCard;
  readonly showWorkShiftCard = this.dialogs.showWorkShiftCard;
  readonly showPersonalEventCard = this.dialogs.showPersonalEventCard;
  readonly showMealPrepCard = this.dialogs.showMealPrepCard;
  readonly quickAddTarget = this.dialogs.quickAddTarget;
  readonly showSettingsDialog = this.dialogs.showSettingsDialog;
  readonly selectedEvent = this.dialogs.selectedEvent;
  readonly showEventModal = this.dialogs.showEventModal;
  readonly selectedWorkoutTemplate = this.dialogs.selectedWorkoutTemplate;
  readonly showFillDialog = this.dialogs.showFillDialog;

  // Expose preset signal for template
  readonly workoutPresets = this.presets.presets;

  readonly selectedConflictIds = signal<Set<string>>(new Set());

  // Week-aware event view: events for the currently navigated week (by date or repeating)
  currentWeekEventsByDay = computed(() => {
    const weekStart = this.nav.currentWeekStart();

    return Array.from({ length: 7 }, (_, day) => {
      const dayDateStr = this.nav.getDayDate(day);
      return this.planner
        .events()
        .filter((e) => {
          if (e.day !== day) return false;
          if (e.isRepeatingWeekly) return true;
          if (e.date) {
            return e.date === dayDateStr;
          }
          const offset = this.currentWeekOffset();
          return e.weekOffset === undefined || e.weekOffset === offset;
        })
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
  });

  constructor() {
    this.migrateLegacyWeekOffsets();

    // Load workouts and calendar events when user is authenticated
    effect(() => {
      if (this.isAuthenticated()) {
        this.planner.loadWorkouts();
        this.planner.loadEventsForWeek(this.currentWeekOffset());
      } else {
        this.planner.clearAllData();
      }
    });

    // Reload events when week changes
    effect(() => {
      const offset = this.currentWeekOffset();
      if (this.isAuthenticated()) {
        this.planner.loadEventsForWeek(offset);
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

  private migrateLegacyWeekOffsets(): void {
    this.planner.events().forEach((event) => {
      if (event.weekOffset !== undefined) {
        return;
      }

      const isRecurringCustomEvent = event.type === 'custom-event' && event.isRepeatingWeekly;
      if (isRecurringCustomEvent) {
        return;
      }

      this.planner.updateEvent({
        ...event,
        weekOffset: 0,
      });
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.nav.initFromQueryParams(params);
    });
  }

  onSettingsChanged(patch: Partial<SchedulerSettings>): void {
    this.planner.updateSettings(patch);
  }

  handleMonthQuickAdd(request: QuickAddRequest): void {
    switch (request.kind) {
      case 'work':
        this.dialogs.openWorkShiftDialog(request.context);
        break;
      case 'workout':
        this.dialogs.openWorkoutDialog(request.context);
        break;
      case 'personal':
        this.dialogs.openPersonalEventDialog(request.context);
        break;
      case 'mealprep':
        this.dialogs.openMealPrepDialog(request.context);
        break;
    }
  }

  async onWorkoutTemplateSaved(payload: WorkoutSavePayload): Promise<void> {
    const selectedWorkout = this.dialogs.selectedWorkoutTemplate();
    if (!selectedWorkout) return;

    await this.planner.updateWorkout(payload.workoutId, {
      name: payload.draft.name.trim(),
      workoutType: payload.draft.workoutType,
      duration: payload.draft.duration,
      frequencyPerWeek: payload.draft.frequencyPerWeek,
      distanceKm: payload.draft.distanceKm,
      notes: payload.draft.notes.trim() || undefined,
      distanceCountsAsLong: selectedWorkout.distanceCountsAsLong,
    });

    if (payload.addAsPreset) {
      this.presets.save({
        name: payload.draft.name.trim(),
        workoutType: payload.draft.workoutType,
        duration: payload.draft.duration,
        distanceKm: payload.draft.distanceKm,
        notes: payload.draft.notes.trim() || undefined,
      });
    }

    this.dialogs.closeWorkoutTemplateEditor();
  }

  async onWorkoutTemplateDeleted(workoutId: string): Promise<void> {
    await this.planner.removeWorkout(workoutId);
    this.dialogs.closeWorkoutTemplateEditor();
  }

  async deleteWorkoutTemplate(workoutId: string, event?: Event): Promise<void> {
    event?.stopPropagation();
    await this.planner.removeWorkout(workoutId);

    if (this.dialogs.selectedWorkoutTemplate()?.id === workoutId) {
      this.dialogs.closeWorkoutTemplateEditor();
    }
  }

  logout(): void {
    this.authService.logout();
  }

  onDayDrop(payload: {
    day: number;
    drop: CdkDragDrop<CalendarEvent[]>;
    startTime?: number;
  }): void {
    this.dragDrop.handleDayDrop({
      ...payload,
      weekOffset: this.nav.currentWeekOffset(),
    });
  }

  onAddCustomEvent(payload: { customEvent: CustomEvent; days: number[] }): void {
    const customEventWeekOffset = payload.customEvent.isRepeatingWeekly
      ? undefined
      : this.nav.currentWeekOffset();
    this.planner.addCustomEvent(payload.customEvent, payload.days, customEventWeekOffset);
  }

  onDeleteCustomEvent(id: string): void {
    this.planner.deleteCustomEvent(id);
  }

  onEventSelected(event: CalendarEvent): void {
    this.dialogs.selectedEvent.set(event);
    this.dialogs.showEventModal.set(true);
  }

  onEventModalClose(): void {
    this.dialogs.showEventModal.set(false);
    this.dialogs.selectedEvent.set(null);
  }

  onEventUpdated(event: CalendarEvent): void {
    this.planner.updateEvent(event);
    this.dialogs.showEventModal.set(false);
    this.dialogs.selectedEvent.set(null);
  }

  onUpdateCommuteForDay(payload: { eventId: string; commuteMinutes: number }): void {
    this.planner.updateEventCommute(payload.eventId, payload.commuteMinutes);
    this.dialogs.showEventModal.set(false);
    this.dialogs.selectedEvent.set(null);
  }

  onUpdateCommuteForAllShifts(payload: {
    shiftLabel: string;
    shiftStartTime: string;
    commuteMinutes: number;
  }): void {
    this.planner.updateEventCommuteByShift(
      payload.shiftLabel,
      payload.shiftStartTime,
      payload.commuteMinutes,
    );
    this.dialogs.showEventModal.set(false);
    this.dialogs.selectedEvent.set(null);
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

  suggestWorkouts(): void {
    // Remove previous suggested workout events from the current week before adding fresh suggestions.
    this.planner
      .events()
      .filter(
        (event) =>
          event.type === 'workout' &&
          event.title.toLowerCase().includes('(suggested)') &&
          (event.weekOffset ?? 0) === this.nav.currentWeekOffset(),
      )
      .forEach((event) => this.planner.removeEvent(event.id));

    const suggestions = this.workoutScheduler.generateSuggestedWorkouts(
      this.nav.currentWeekOffset(),
    );

    suggestions.forEach((suggestion) => {
      this.planner.addManualEvent(
        suggestion.day,
        'workout',
        suggestion.title,
        suggestion.duration,
        suggestion.workoutType,
        suggestion.distance,
        undefined,
        suggestion.startMinutes,
        this.nav.currentWeekOffset(),
      );
    });
  }

  confirmFillFromPreviousWeek(option: 'work' | 'workouts-events' | 'everything'): void {
    this.copyEventsFromPreviousWeek(option);
    this.dialogs.closeFillDialog();
  }

  private copyEventsFromPreviousWeek(option: 'work' | 'workouts-events' | 'everything'): void {
    const targetWeekOffset = this.nav.currentWeekOffset();
    const sourceWeekOffset = targetWeekOffset - 1;

    const isIncludedType = (event: CalendarEvent): boolean =>
      (option === 'work' && event.type === 'shift') ||
      (option === 'workouts-events' &&
        (event.type === 'workout' || event.type === 'mealprep' || event.type === 'custom-event')) ||
      option === 'everything';

    const sourceEvents = this.planner
      .events()
      .filter((event) => event.weekOffset === sourceWeekOffset)
      .filter(isIncludedType);

    const targetEvents = this.planner
      .events()
      .filter((event) => event.weekOffset === targetWeekOffset)
      .filter(isIncludedType);

    const signature = (event: CalendarEvent): string =>
      `${event.type}|${event.day}|${event.startTime}|${event.endTime}|${event.title}`;
    const existingTargetSignatures = new Set(targetEvents.map(signature));

    sourceEvents.forEach((event) => {
      const eventSignature = signature(event);
      if (existingTargetSignatures.has(eventSignature)) {
        return;
      }

      this.planner.addCalendarEventDirectly({
        ...event,
        id: crypto.randomUUID(),
        weekOffset: targetWeekOffset,
      });
    });
  }

  getCurrentWeekLabel(): string {
    return this.nav.getCurrentWeekLabel();
  }

  getWeekDateLabels(): string[] {
    return this.nav.getWeekDateLabels();
  }

  // Daily view helpers
  getTodayIndex(): number {
    const jsDay = new Date().getDay();
    return jsDay === 0 ? 6 : jsDay - 1;
  }

  getWeeklySnapshot(): {
    totalWorkouts: number;
    totalDuration: number;
    placedWorkouts: number;
    unplacedWorkouts: number;
    averagePerDay: number;
  } {
    const eventsByDay = this.currentWeekEventsByDay();
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

  // Quick-add card event handlers
  async onWorkoutAdded(payload: WorkoutQuickAddPayload): Promise<void> {
    if (payload.kind === 'preset-planned') {
      const preset = this.presets.getById(payload.presetId);
      if (!preset) {
        return;
      }

      this.planner.addManualEvent(
        payload.day,
        'workout',
        preset.name,
        preset.duration,
        preset.workoutType,
        preset.distanceKm,
        undefined,
        this.timeToMinutes(payload.startTime),
        payload.weekOffset,
        payload.notes || preset.notes,
      );
      this.dialogs.closeWorkoutDialog();
      return;
    }

    if (payload.kind === 'new-planned') {
      this.planner.addManualEvent(
        payload.day,
        'workout',
        payload.sessionName,
        payload.duration,
        payload.type,
        payload.distance,
        undefined,
        this.timeToMinutes(payload.startTime),
        payload.weekOffset,
        payload.notes,
      );

      if (payload.saveAsPreset) {
        this.presets.save({
          name: payload.sessionName,
          workoutType: payload.type,
          duration: payload.duration,
          distanceKm: payload.distance,
          notes: payload.notes,
        });
      }

      this.dialogs.closeWorkoutDialog();
      return;
    }

    if (payload.kind === 'preset') {
      const preset = this.presets.getById(payload.presetId);
      if (!preset) {
        return;
      }

      await this.planner.addWorkout(
        preset.workoutType,
        preset.name,
        preset.duration,
        payload.timeframe,
        preset.distanceKm,
        payload.notes || preset.notes,
      );
      this.dialogs.closeWorkoutDialog();
      return;
    }

    await this.planner.addWorkout(
      payload.type,
      payload.sessionName,
      payload.duration,
      payload.timeframe,
      payload.distance,
      payload.notes,
    );

    if (payload.saveAsPreset) {
      this.presets.save({
        name: payload.sessionName,
        workoutType: payload.type,
        duration: payload.duration,
        distanceKm: payload.distance,
        notes: payload.notes,
      });
    }

    this.dialogs.closeWorkoutDialog();
  }

  onWorkoutPresetUpdated(payload: {
    id: string;
    name: string;
    workoutType: WorkoutType;
    duration: number;
    distanceKm?: number;
    notes?: string;
  }): void {
    this.presets.update(payload);
  }

  onWorkoutPresetDeleted(presetId: string): void {
    this.presets.delete(presetId);
  }

  onWorkShiftAdded(payload: {
    title: string;
    startTime: string;
    endTime: string;
    commute: number;
    bedtime?: string;
    wakeTime?: string;
    repeat: number[];
    weekOffset: number;
  }): void {
    // Create a custom work shift and schedule it for the selected days
    const selectedDays = payload.repeat.length > 0 ? payload.repeat : [this.getTodayIndex()];
    selectedDays.forEach((dayIndex) => {
      this.planner.createShiftEvent(
        payload.title,
        payload.startTime,
        payload.endTime,
        dayIndex,
        payload.commute,
        payload.weekOffset,
      );
    });
    this.dialogs.closeWorkShiftDialog();
  }

  onPersonalEventAdded(payload: {
    title: string;
    startTime: string;
    endTime: string;
    commute: number;
    repeat: number[];
    weekOffset: number;
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
      const weekOffset = customEvent.isRepeatingWeekly ? undefined : payload.weekOffset;
      this.planner.addCustomEvent(customEvent, [dayIndex], weekOffset);
    });
    this.dialogs.closePersonalEventDialog();
  }

  onMealPrepAdded(payload: MealPrepQuickAddPayload): void {
    this.planner.addManualEvent(
      payload.day,
      'mealprep',
      payload.title || 'Meal Prep',
      payload.duration,
      undefined,
      undefined,
      undefined,
      this.timeToMinutes(payload.startTime),
      payload.weekOffset,
    );
    this.dialogs.closeMealPrepDialog();
  }

  getCurrentWeekDates(): { start: Date; end: Date } {
    return this.nav.getCurrentWeekDates();
  }

  private timeToMinutes(value: string): number {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
