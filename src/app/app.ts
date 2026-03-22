import { CdkDragDrop, CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CalendarEvent } from './core/models/calendar-event.model';
import { CustomEvent } from './core/models/custom-event.model';
import { DragData, WorkoutTemplateDragData, isCalendarEvent } from './core/models/drag-data.model';
import {
  SchedulerSettings,
  WorkoutType as PreferenceWorkoutType,
} from './core/models/scheduler-settings.model';
import {
  DEFAULT_ONBOARDING_DATA,
  OnboardingData,
  ONBOARDING_LOCAL_STORAGE_KEY,
} from './core/models/onboarding-data.model';
import { WORKOUT_TYPE_LABELS, Workout, WorkoutType } from './core/models/workout.model';
import { PlannerService } from './core/services/planner.service';
import { AuthService } from './core/services/auth.service';
import { CalendarComponent } from './features/calendar/calendar.component';
import { DailyViewComponent } from './features/daily-view/daily-view.component';
import { MonthViewComponent, QuickAddRequest } from './features/month-view/month-view.component';
import { OnboardingComponent } from './features/onboarding/onboarding.component';
import { SchedulerSettingsComponent } from './features/scheduler-settings/scheduler-settings.component';
import { LoginComponent } from './features/login/login.component';
import { EventDetailsModalComponent } from './shared/components/event-details-modal/event-details-modal.component';
import { ConnectionBannerComponent } from './shared/components/connection-banner/connection-banner.component';
import { QuickAddWorkoutCardComponent } from './features/quick-add-cards/quick-add-workout-card.component';
import { QuickAddWorkShiftCardComponent } from './features/quick-add-cards/quick-add-work-event-card.component';
import { QuickAddPersonalEventCardComponent } from './features/quick-add-cards/quick-add-personal-event-card.component';
import { QuickAddMealPrepCardComponent } from './features/quick-add-cards/quick-add-mealprep-card.component';
import { WorkoutPreset } from './core/models/workout-preset.model';

interface QuickAddTargetContext {
  day: number;
  weekOffset: number;
  label: string;
  date: Date;
}

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

interface WorkoutEditDraft {
  name: string;
  workoutType: WorkoutType;
  duration: number;
  frequencyPerWeek: number;
  distanceKm: number | undefined;
  notes: string;
}

const WORKOUT_PRESETS_STORAGE_KEY = 'week-planner-workout-presets';

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
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
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

  // View state for tab navigation (initialized from query params in ngOnInit)
  currentView = signal<'daily' | 'week' | 'month' | 'onboarding'>('daily');
  
  private readonly validViews = ['daily', 'week', 'month', 'onboarding'] as const;

  // Quick add card visibility
  showWorkoutCard = signal(false);
  showWorkShiftCard = signal(false);
  showPersonalEventCard = signal(false);
  showMealPrepCard = signal(false);
  quickAddTarget = signal<QuickAddTargetContext | null>(null);
  workoutPresets = signal<WorkoutPreset[]>(this.loadWorkoutPresets());
  selectedWorkoutTemplate = signal<Workout | null>(null);
  addEditedWorkoutAsPreset = signal(false);
  workoutEditDraft = signal<WorkoutEditDraft>({
    name: '',
    workoutType: 'running',
    duration: 45,
    frequencyPerWeek: 1,
    distanceKm: undefined,
    notes: '',
  });

  readonly workoutTypeOptions: Array<{ value: WorkoutType; label: string }> = [
    { value: 'running', label: WORKOUT_TYPE_LABELS.running },
    { value: 'swimming', label: WORKOUT_TYPE_LABELS.swimming },
    { value: 'biking', label: WORKOUT_TYPE_LABELS.biking },
    { value: 'strength', label: WORKOUT_TYPE_LABELS.strength },
    { value: 'yoga', label: WORKOUT_TYPE_LABELS.yoga },
  ];

  // Monthly view state
  currentMonthDate = signal<Date>(new Date());
  currentWeekOffset = signal(0);

  showSettingsDialog = false;
  selectedEvent = signal<CalendarEvent | null>(null);
  showEventModal = signal(false);
  selectedConflictIds = signal<Set<string>>(new Set());

  // Fill dialog state
  showFillDialog = signal(false);

  // Calculate the date range for the current week view
  currentWeekStart = computed(() => {
    const offset = this.currentWeekOffset();
    const weekStart = this.planner.getWeekStartDate();
    weekStart.setDate(weekStart.getDate() + offset * 7);
    return weekStart;
  });
  
  currentWeekEnd = computed(() => {
    const start = this.currentWeekStart();
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return end;
  });

  // Format the week date range for display
  currentWeekLabel = computed(() => {
    const start = this.currentWeekStart();
    const end = this.currentWeekEnd();
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  });

  // Get the date string for a specific day in the current week
  getDayDate(dayIndex: number): string {
    const weekStart = this.currentWeekStart();
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + dayIndex);
    return this.planner.formatDate(date);
  }
  
  // Get formatted date for display in day headers
  getDayDateDisplay(dayIndex: number): string {
    const weekStart = this.currentWeekStart();
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + dayIndex);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Week-aware event view: events for the currently navigated week (by date or repeating)
  currentWeekEventsByDay = computed(() => {
    const weekStart = this.currentWeekStart();
    const startDateStr = this.planner.formatDate(weekStart);
    const endDate = new Date(weekStart);
    endDate.setDate(weekStart.getDate() + 6);
    const endDateStr = this.planner.formatDate(endDate);
    
    return Array.from({ length: 7 }, (_, day) => {
      const dayDateStr = this.getDayDate(day);
      return this.planner
        .events()
        .filter((e) => {
          // Event matches this day
          if (e.day !== day) return false;
          
          // Repeating events show on all weeks
          if (e.isRepeatingWeekly) return true;
          
          // Events with specific dates must match
          if (e.date) {
            return e.date === dayDateStr;
          }
          
          // Legacy: events without date - show if they have matching weekOffset or no weekOffset
          const offset = this.currentWeekOffset();
          return e.weekOffset === undefined || e.weekOffset === offset;
        })
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
  });

  constructor(readonly planner: PlannerService) {
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
      if (
        this.showSettingsDialog ||
        this.showEventModal() ||
        this.showFillDialog() ||
        this.showWorkoutCard() ||
        this.showWorkShiftCard() ||
        this.showPersonalEventCard() ||
        this.showMealPrepCard() ||
        this.selectedWorkoutTemplate()
      ) {
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
    // Initialize state from query parameters
    this.route.queryParams.subscribe((params) => {
      // Read view parameter
      const viewParam = params['view'];
      if (viewParam && this.validViews.includes(viewParam)) {
        this.currentView.set(viewParam as typeof this.validViews[number]);
      }
      
      // Read week offset parameter
      const weekParam = params['week'];
      if (weekParam !== undefined) {
        const weekOffset = parseInt(weekParam, 10);
        if (!isNaN(weekOffset)) {
          this.currentWeekOffset.set(weekOffset);
          this.syncMonthToCurrentWeek();
        }
      }
    });
  }

  private updateQueryParams(): void {
    const queryParams: Record<string, string | number | null> = {
      view: this.currentView(),
    };
    
    // Only include week param if not 0 (current week)
    const weekOffset = this.currentWeekOffset();
    if (weekOffset !== 0) {
      queryParams['week'] = weekOffset;
    } else {
      queryParams['week'] = null; // Remove from URL
    }
    
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
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

  openWorkShiftDialog(target: QuickAddTargetContext | null = null): void {
    this.setActiveQuickAddDialog('work', target);
  }

  closeWorkShiftDialog(): void {
    this.showWorkShiftCard.set(false);
    this.clearQuickAddTargetIfIdle();
  }

  openWorkoutDialog(target: QuickAddTargetContext | null = null): void {
    this.setActiveQuickAddDialog('workout', target);
  }

  closeWorkoutDialog(): void {
    this.showWorkoutCard.set(false);
    this.clearQuickAddTargetIfIdle();
  }

  openPersonalEventDialog(target: QuickAddTargetContext | null = null): void {
    this.setActiveQuickAddDialog('personal', target);
  }

  closePersonalEventDialog(): void {
    this.showPersonalEventCard.set(false);
    this.clearQuickAddTargetIfIdle();
  }

  openMealPrepDialog(target: QuickAddTargetContext | null = null): void {
    this.setActiveQuickAddDialog('mealprep', target);
  }

  closeMealPrepDialog(): void {
    this.showMealPrepCard.set(false);
    this.clearQuickAddTargetIfIdle();
  }

  handleMonthQuickAdd(request: QuickAddRequest): void {
    // The MonthViewComponent closes its own modal, so we just open the quick-add dialog
    switch (request.kind) {
      case 'work':
        this.openWorkShiftDialog(request.context);
        break;
      case 'workout':
        this.openWorkoutDialog(request.context);
        break;
      case 'personal':
        this.openPersonalEventDialog(request.context);
        break;
      case 'mealprep':
        this.openMealPrepDialog(request.context);
        break;
    }
  }

  openWorkoutTemplateEditor(workout: Workout): void {
    this.selectedWorkoutTemplate.set(workout);
    this.addEditedWorkoutAsPreset.set(false);
    this.workoutEditDraft.set({
      name: workout.name,
      workoutType: workout.workoutType,
      duration: workout.duration,
      frequencyPerWeek: workout.frequencyPerWeek,
      distanceKm: workout.distanceKm,
      notes: workout.notes || '',
    });
  }

  closeWorkoutTemplateEditor(): void {
    this.selectedWorkoutTemplate.set(null);
    this.addEditedWorkoutAsPreset.set(false);
  }

  async deleteWorkoutTemplate(workoutId: string, event?: Event): Promise<void> {
    event?.stopPropagation();
    await this.planner.removeWorkout(workoutId);

    if (this.selectedWorkoutTemplate()?.id === workoutId) {
      this.closeWorkoutTemplateEditor();
    }
  }

  updateWorkoutEditField(
    field: keyof WorkoutEditDraft,
    value: string | number | undefined,
  ): void {
    this.workoutEditDraft.update((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async saveWorkoutTemplateEdits(): Promise<void> {
    const selectedWorkout = this.selectedWorkoutTemplate();
    if (!selectedWorkout) {
      return;
    }

    const draft = this.workoutEditDraft();
    if (!draft.name.trim() || draft.duration <= 0 || draft.frequencyPerWeek <= 0) {
      return;
    }

    await this.planner.updateWorkout(selectedWorkout.id, {
      name: draft.name.trim(),
      workoutType: draft.workoutType,
      duration: draft.duration,
      frequencyPerWeek: draft.frequencyPerWeek,
      distanceKm: draft.distanceKm,
      notes: draft.notes.trim() || undefined,
      distanceCountsAsLong: selectedWorkout.distanceCountsAsLong,
    });

    if (this.addEditedWorkoutAsPreset()) {
      this.saveWorkoutPreset({
        name: draft.name.trim(),
        workoutType: draft.workoutType,
        duration: draft.duration,
        distanceKm: draft.distanceKm,
        notes: draft.notes.trim() || undefined,
      });
    }

    this.closeWorkoutTemplateEditor();
  }

  logout(): void {
    this.authService.logout();
  }

  onDayDrop(payload: {
    day: number;
    drop: CdkDragDrop<CalendarEvent[]>;
    startTime?: number;
  }): void {
    const dragData = payload.drop.item.data as DragData;
    const startTimeMinutes = payload.startTime;
    const weekOffset = this.currentWeekOffset();

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
            startTimeMinutes,
            weekOffset,
            dragData.workout.notes,
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
            0, // Start at midnight
            weekOffset,
            dragData.workout.notes,
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
            startTimeMinutes,
            weekOffset,
            dragData.workout.notes,
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
          dragData.workout.distanceCountsAsLong,
          undefined,
          weekOffset,
          dragData.workout.notes,
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

  onAddCustomEvent(payload: { customEvent: CustomEvent; days: number[] }): void {
    const customEventWeekOffset = payload.customEvent.isRepeatingWeekly
      ? undefined
      : this.currentWeekOffset();
    this.planner.addCustomEvent(payload.customEvent, payload.days, customEventWeekOffset);
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
    this.updateQueryParams();
  }

  showWeekView(): void {
    this.currentView.set('week');
    this.updateQueryParams();
  }

  showMonthView(): void {
    this.currentView.set('month');
    this.updateQueryParams();
  }

  showOnboardingView(): void {
    this.currentView.set('onboarding');
    this.updateQueryParams();
  }

  previousWeek(): void {
    this.currentWeekOffset.update((offset) => offset - 1);
    this.syncMonthToCurrentWeek();
    this.updateQueryParams();
    // Events will be loaded by the effect watching currentWeekOffset
  }

  nextWeek(): void {
    this.currentWeekOffset.update((offset) => offset + 1);
    this.syncMonthToCurrentWeek();
    this.updateQueryParams();
    // Events will be loaded by the effect watching currentWeekOffset
  }

  goToToday(): void {
    this.currentWeekOffset.set(0);
    this.syncMonthToCurrentWeek();
    this.updateQueryParams();
    // Events will be loaded by the effect watching currentWeekOffset
  }

  suggestWorkouts(): void {
    const onboarding = this.getOnboardingData();
    const selectedTypes = this.getPreferredWorkoutTypes(onboarding);
    const weeklyTarget = Math.max(1, this.settingsTargetOrOnboarding(onboarding));

    // Remove previous suggested workout events from the current week before adding fresh suggestions.
    this.planner
      .events()
      .filter(
        (event) =>
          event.type === 'workout' &&
          event.title.toLowerCase().includes('(suggested)') &&
          (event.weekOffset ?? 0) === this.currentWeekOffset(),
      )
      .forEach((event) => this.planner.removeEvent(event.id));

    const workoutSequence = this.buildWorkoutSequence(selectedTypes, weeklyTarget);
    const timeSequence = this.buildPreferredTimeSequence(onboarding);

    workoutSequence.forEach((workoutType, index) => {
      const day = index % 7;
      const startTime = timeSequence[index % timeSequence.length];
      const startMinutes = this.getWorkoutStartWithCommuteBuffer(
        day,
        this.timeToMinutes(startTime),
      );

      this.planner.addManualEvent(
        day,
        'workout',
        `${this.getWorkoutLabel(workoutType)} (suggested)`,
        this.getDefaultDuration(workoutType),
        workoutType,
        this.getDefaultDistance(workoutType),
        undefined,
        startMinutes,
        this.currentWeekOffset(),
      );
    });
  }

  fillFromPreviousWeek(): void {
    // Always show the dialog to let user choose what to fill
    this.showFillDialog.set(true);
  }

  confirmFillFromPreviousWeek(option: 'work' | 'workouts-events' | 'everything'): void {
    this.copyEventsFromPreviousWeek(option);
    this.showFillDialog.set(false);
  }

  closeFillDialog(): void {
    this.showFillDialog.set(false);
  }

  private copyEventsFromPreviousWeek(option: 'work' | 'workouts-events' | 'everything'): void {
    const targetWeekOffset = this.currentWeekOffset();
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

  getWeekDateLabels(): string[] {
    const { start } = this.getCurrentWeekDates();
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })}`;
    });
  }

  getCurrentWeekLabel(): string {
    const today = new Date();
    const mondayOffset = today.getDay() === 0 ? -6 : 1 - today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + mondayOffset);
    weekStart.setDate(weekStart.getDate() + this.currentWeekOffset() * 7);

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
  async onWorkoutAdded(payload: WorkoutQuickAddPayload): Promise<void> {
    if (payload.kind === 'preset-planned') {
      const preset = this.workoutPresets().find((item) => item.id === payload.presetId);
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
      this.closeWorkoutDialog();
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
        this.saveWorkoutPreset({
          name: payload.sessionName,
          workoutType: payload.type,
          duration: payload.duration,
          distanceKm: payload.distance,
          notes: payload.notes,
        });
      }

      this.closeWorkoutDialog();
      return;
    }

    if (payload.kind === 'preset') {
      const preset = this.workoutPresets().find((item) => item.id === payload.presetId);
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
      this.closeWorkoutDialog();
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
      this.saveWorkoutPreset({
        name: payload.sessionName,
        workoutType: payload.type,
        duration: payload.duration,
        distanceKm: payload.distance,
        notes: payload.notes,
      });
    }

    this.closeWorkoutDialog();
  }

  onWorkoutPresetUpdated(payload: {
    id: string;
    name: string;
    workoutType: WorkoutType;
    duration: number;
    distanceKm?: number;
    notes?: string;
  }): void {
    const nextPresets = this.workoutPresets().map((preset) =>
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

    this.persistWorkoutPresets(nextPresets);
  }

  onWorkoutPresetDeleted(presetId: string): void {
    const nextPresets = this.workoutPresets().filter((preset) => preset.id !== presetId);
    this.persistWorkoutPresets(nextPresets);
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
    this.closeWorkShiftDialog();
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
    this.closePersonalEventDialog();
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
    this.closeMealPrepDialog();
  }

  // Month view event mapping
  getCurrentWeekDates(): { start: Date; end: Date } {
    const today = new Date();
    const jsDay = today.getDay(); // 0 = Sunday
    const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay; // Calculate Monday offset

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + mondayOffset + this.currentWeekOffset() * 7);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return { start: weekStart, end: weekEnd };
  }

  private syncMonthToCurrentWeek(): void {
    const { start } = this.getCurrentWeekDates();
    this.currentMonthDate.set(new Date(start.getFullYear(), start.getMonth(), 1));
  }

  private getOnboardingData(): OnboardingData {
    try {
      const raw = localStorage.getItem(ONBOARDING_LOCAL_STORAGE_KEY);
      return raw
        ? { ...DEFAULT_ONBOARDING_DATA, ...JSON.parse(raw) }
        : { ...DEFAULT_ONBOARDING_DATA };
    } catch {
      return { ...DEFAULT_ONBOARDING_DATA };
    }
  }

  private settingsTargetOrOnboarding(onboarding: OnboardingData): number {
    return this.planner.settings().weeklyWorkoutsTarget || onboarding.targetWorkoutsPerWeek;
  }

  private getPreferredWorkoutTypes(onboarding: OnboardingData): PreferenceWorkoutType[] {
    const settingsTypes = this.planner.settings().workoutTypes;
    if (settingsTypes?.length) {
      return settingsTypes;
    }

    const mapped = onboarding.favoriteWorkouts
      .map((type) => {
        if (type === 'strength') return 'strength';
        if (type === 'cardio') return 'cardio';
        if (type === 'flexibility') return 'flexibility';
        if (type === 'recovery') return 'recovery';
        return null;
      })
      .filter((type): type is PreferenceWorkoutType => !!type);

    return mapped.length ? mapped : ['strength', 'cardio'];
  }

  private buildWorkoutSequence(types: PreferenceWorkoutType[], target: number): WorkoutType[] {
    const mapType = (type: PreferenceWorkoutType): WorkoutType => {
      if (type === 'cardio') return 'running';
      if (type === 'flexibility') return 'yoga';
      if (type === 'recovery') return 'yoga';
      return 'strength';
    };

    const sequence: WorkoutType[] = [];
    types.forEach((type) => sequence.push(mapType(type)));

    // Hardcoded fallback repetition requested by user.
    const fallback: WorkoutType[] = ['strength', 'running'];
    let fallbackIndex = 0;

    while (sequence.length < target) {
      sequence.push(fallback[fallbackIndex % fallback.length]);
      fallbackIndex += 1;
    }

    return sequence.slice(0, target);
  }

  private buildPreferredTimeSequence(onboarding: OnboardingData): string[] {
    const preferred = this.planner.settings().preferredWorkoutTimes?.length
      ? this.planner.settings().preferredWorkoutTimes
      : onboarding.preferredWorkoutTimes;

    const mapped = preferred.map((slot) => {
      if (slot === 'early') return '07:00';
      if (slot === 'evening') return '18:00';
      return '12:00';
    });

    return mapped.length ? mapped : ['18:00'];
  }

  private getWorkoutLabel(type: WorkoutType): string {
    if (type === 'running') return 'Running';
    if (type === 'biking') return 'Biking';
    if (type === 'swimming') return 'Swimming';
    if (type === 'yoga') return 'Yoga';
    return 'Strength';
  }

  private getDefaultDuration(type: WorkoutType): number {
    if (type === 'running') return 45;
    if (type === 'biking') return 60;
    if (type === 'swimming') return 60;
    if (type === 'yoga') return 40;
    return 50;
  }

  private getDefaultDistance(type: WorkoutType): number | undefined {
    if (type === 'running') return 5;
    if (type === 'biking') return 20;
    if (type === 'swimming') return 2;
    return undefined;
  }

  private timeToMinutes(value: string): number {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private getWorkoutStartWithCommuteBuffer(day: number, preferredStart: number): number {
    const shifts = this.planner
      .events()
      .filter(
        (event) =>
          event.type === 'shift' &&
          event.day === day &&
          (event.weekOffset === undefined || event.weekOffset === this.currentWeekOffset()),
      );

    if (shifts.length === 0) {
      return preferredStart;
    }

    const latestBlockedEnd = shifts.reduce((max, shift) => {
      const end = this.timeToMinutes(shift.endTime);
      const commute = shift.commuteMinutes || 0;
      return Math.max(max, end + commute);
    }, 0);

    const adjusted = Math.max(preferredStart, latestBlockedEnd);
    // Snap to next 30-minute interval for cleaner blocks.
    const snapped = Math.ceil(adjusted / 30) * 30;
    return Math.min(snapped, 23 * 60 + 30);
  }

  /** Returns the week offset (relative to today's real week = 0) for any arbitrary date. */
  private getWeekOffsetForDate(date: Date): number {
    const jsDay = date.getDay();
    const dateMonday = new Date(date);
    dateMonday.setDate(date.getDate() + (jsDay === 0 ? -6 : 1 - jsDay));
    dateMonday.setHours(0, 0, 0, 0);

    const today = new Date();
    const todayMonday = new Date(today);
    todayMonday.setDate(today.getDate() + (today.getDay() === 0 ? -6 : 1 - today.getDay()));
    todayMonday.setHours(0, 0, 0, 0);

    return Math.round((dateMonday.getTime() - todayMonday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  }

  /**
   * Get reminders based on today's schedule
   * Used by the daily view component for backwards compatibility
   */
  private getTodaysEvents(): CalendarEvent[] {
    const today = new Date();
    const todayIndex = this.getTodayIndex();
    const todayDateStr = this.planner.formatDate(today);
    
    return this.planner
      .events()
      .filter((event) => {
        if (event.day !== todayIndex) return false;
        if (event.isRepeatingWeekly) return true;
        if (event.date) {
          return event.date === todayDateStr;
        }
        return event.weekOffset === undefined || event.weekOffset === 0;
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }
  
  private getNextUpcomingEvents(): CalendarEvent[] {
    const now = new Date();
    const upcoming: Array<{ event: CalendarEvent; start: number }> = [];

    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const date = new Date(now);
      date.setDate(now.getDate() + dayOffset);
      date.setHours(0, 0, 0, 0);

      const jsDay = date.getDay();
      const weekdayIndex = jsDay === 0 ? 6 : jsDay - 1;
      const dateStr = this.planner.formatDate(date);

      const dayEvents = this.planner
        .events()
        .filter((event) => {
          if (event.day !== weekdayIndex) return false;
          if (event.isRepeatingWeekly) return true;
          if (event.date) {
            return event.date === dateStr;
          }
          const weekOffset = this.getWeekOffsetForDate(date);
          return event.weekOffset === undefined || event.weekOffset === weekOffset;
        });

      dayEvents.forEach((event) => {
        const [hours, minutes] = event.startTime.split(':').map(Number);
        const eventStart = new Date(date);
        eventStart.setHours(hours, minutes, 0, 0);

        if (eventStart.getTime() <= now.getTime()) {
          return;
        }

        upcoming.push({ event, start: eventStart.getTime() });
      });
    }

    return upcoming
      .sort((a, b) => a.start - b.start)
      .slice(0, 6)
      .map((item) => item.event);
  }

  private setActiveQuickAddDialog(
    kind: 'work' | 'workout' | 'personal' | 'mealprep',
    target: QuickAddTargetContext | null,
  ): void {
    this.showWorkShiftCard.set(kind === 'work');
    this.showWorkoutCard.set(kind === 'workout');
    this.showPersonalEventCard.set(kind === 'personal');
    this.showMealPrepCard.set(kind === 'mealprep');
    this.quickAddTarget.set(target);
  }

  private clearQuickAddTargetIfIdle(): void {
    if (
      !this.showWorkShiftCard() &&
      !this.showWorkoutCard() &&
      !this.showPersonalEventCard() &&
      !this.showMealPrepCard()
    ) {
      this.quickAddTarget.set(null);
    }
  }

  private getQuickAddTargetForMonthDay(dateOfMonth: number): QuickAddTargetContext {
    const currentMonth = this.currentMonthDate();
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dateOfMonth);
    const jsDay = date.getDay();

    return {
      day: jsDay === 0 ? 6 : jsDay - 1,
      weekOffset: this.getWeekOffsetForDate(date),
      label: date.toLocaleString('default', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
      date,
    };
  }

  private loadWorkoutPresets(): WorkoutPreset[] {
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

  private saveWorkoutPreset(preset: Omit<WorkoutPreset, 'id'>): void {
    const nextPresets = [
      ...this.workoutPresets(),
      {
        id: crypto.randomUUID(),
        name: preset.name.trim(),
        workoutType: preset.workoutType,
        duration: preset.duration,
        distanceKm: preset.distanceKm,
        notes: preset.notes,
      },
    ];

    this.persistWorkoutPresets(nextPresets);
  }

  private persistWorkoutPresets(nextPresets: WorkoutPreset[]): void {
    this.workoutPresets.set(nextPresets);

    try {
      localStorage.setItem(WORKOUT_PRESETS_STORAGE_KEY, JSON.stringify(nextPresets));
    } catch {
      // Ignore storage failures and keep the in-memory presets available for the session.
    }
  }
}
