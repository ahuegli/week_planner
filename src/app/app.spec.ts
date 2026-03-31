import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { App } from './app';
import { DEFAULT_SETTINGS } from './core/models/scheduler-settings.model';
import { PlannerService } from './core/services/planner.service';
import { WeekNavigationService } from './core/services/week-navigation.service';
import { DialogStateService } from './core/services/dialog-state.service';
import { WorkoutPresetService } from './core/services/workout-preset.service';
import { AuthService } from './core/services/auth.service';
import { WorkoutSchedulerService } from './core/services/workout-scheduler.service';

function createCallRecorder() {
  const calls: unknown[][] = [];
  const recorder = (...args: unknown[]) => {
    calls.push(args);
  };

  return Object.assign(recorder, { calls });
}

function createPlannerMock() {
  return {
    eventsByDay: signal(Array.from({ length: 7 }, () => [])),
    events: signal([]),
    workouts: signal([]),
    settings: signal(DEFAULT_SETTINGS),
    unplacedWorkouts: signal([]),
    optimizationProposal: signal(null),
    loadWorkouts: createCallRecorder(),
    loadEventsForWeek: createCallRecorder(),
    clearAllData: createCallRecorder(),
    generateSuggestedPlan: createCallRecorder(),
    removeEvent: createCallRecorder(),
    updateSettings: createCallRecorder(),
    clearOptimizationProposal: createCallRecorder(),
    addWorkout: createCallRecorder(),
    updateWorkout: createCallRecorder(),
    removeWorkout: createCallRecorder(),
    addCustomEvent: createCallRecorder(),
    createShiftEvent: createCallRecorder(),
    updateEvent: createCallRecorder(),
    updateEventCommute: createCallRecorder(),
    updateEventCommuteByShift: createCallRecorder(),
    removeFirstUnplacedWorkout: createCallRecorder(),
    applyOptimizationSelection: createCallRecorder(),
    formatDate: (date: Date) => date.toISOString().split('T')[0],
  };
}

function createNavMock() {
  return {
    currentView: signal<'daily' | 'week' | 'month' | 'onboarding'>('daily'),
    currentWeekOffset: signal(0),
    currentMonthDate: signal(new Date()),
    currentWeekStart: signal(new Date()),
    currentWeekEnd: signal(new Date()),
    currentWeekLabel: signal(''),
    initFromQueryParams: createCallRecorder(),
    showDailyView: createCallRecorder(),
    showWeekView: createCallRecorder(),
    showMonthView: createCallRecorder(),
    showOnboardingView: createCallRecorder(),
    previousWeek: createCallRecorder(),
    nextWeek: createCallRecorder(),
    goToToday: createCallRecorder(),
    previousMonth: createCallRecorder(),
    nextMonth: createCallRecorder(),
    getCurrentWeekDates: () => ({ start: new Date(), end: new Date() }),
    getWeekDateLabels: () => ['1 Jan', '2 Jan', '3 Jan', '4 Jan', '5 Jan', '6 Jan', '7 Jan'],
    getCurrentWeekLabel: () => 'Jan 1 - 7, 2026',
    getDayDate: () => '2026-01-01',
  };
}

function createDialogsMock() {
  return {
    showWorkoutCard: signal(false),
    showWorkShiftCard: signal(false),
    showPersonalEventCard: signal(false),
    showMealPrepCard: signal(false),
    quickAddTarget: signal(null),
    showSettingsDialog: signal(false),
    selectedEvent: signal(null),
    showEventModal: signal(false),
    selectedWorkoutTemplate: signal(null),
    showFillDialog: signal(false),
    openSettings: createCallRecorder(),
    closeSettings: createCallRecorder(),
    openWorkShiftDialog: createCallRecorder(),
    closeWorkShiftDialog: createCallRecorder(),
    openWorkoutDialog: createCallRecorder(),
    closeWorkoutDialog: createCallRecorder(),
    openPersonalEventDialog: createCallRecorder(),
    closePersonalEventDialog: createCallRecorder(),
    openMealPrepDialog: createCallRecorder(),
    closeMealPrepDialog: createCallRecorder(),
    openWorkoutTemplateEditor: createCallRecorder(),
    closeWorkoutTemplateEditor: createCallRecorder(),
    openFillDialog: createCallRecorder(),
    closeFillDialog: createCallRecorder(),
    openEventModal: createCallRecorder(),
    closeEventModal: createCallRecorder(),
  };
}

function createPresetsMock() {
  return {
    presets: signal([]),
    save: createCallRecorder(),
    update: createCallRecorder(),
    delete: createCallRecorder(),
    getById: () => undefined,
  };
}

function createAuthMock() {
  return {
    isAuthenticated: signal(true),
    user: signal({ id: '1', email: 'test@test.com', name: 'Test' }),
    logout: createCallRecorder(),
  };
}

function createSchedulerMock() {
  return {
    generateSuggestedWorkouts: () => [],
  };
}

describe('App', () => {
  let plannerMock: ReturnType<typeof createPlannerMock>;
  let navMock: ReturnType<typeof createNavMock>;
  let dialogsMock: ReturnType<typeof createDialogsMock>;
  let presetsMock: ReturnType<typeof createPresetsMock>;

  beforeEach(async () => {
    localStorage.clear();
    plannerMock = createPlannerMock();
    navMock = createNavMock();
    dialogsMock = createDialogsMock();
    presetsMock = createPresetsMock();

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: PlannerService, useValue: plannerMock },
        { provide: WeekNavigationService, useValue: navMock },
        { provide: DialogStateService, useValue: dialogsMock },
        { provide: WorkoutPresetService, useValue: presetsMock },
        { provide: AuthService, useValue: createAuthMock() },
        { provide: WorkoutSchedulerService, useValue: createSchedulerMock() },
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render planner title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Week Planner');
  });

  it('should add a workout template from quick add and close the dialog', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.nav.showWeekView();
    app.dialogs.openWorkoutDialog();
    fixture.detectChanges();

    await app.onWorkoutAdded({
      kind: 'new',
      type: 'running',
      sessionName: 'Tempo Run',
      duration: 45,
      timeframe: 3,
      distance: 10,
      saveAsPreset: false,
    });
    fixture.detectChanges();

    expect(plannerMock.addWorkout.calls).toEqual([['running', 'Tempo Run', 45, 3, 10, undefined]]);
    expect(app.showWorkoutCard()).toBe(false);
  });

  it('should save a workout preset when requested', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    await app.onWorkoutAdded({
      kind: 'new',
      type: 'strength',
      sessionName: 'Upper Body',
      duration: 50,
      timeframe: 2,
      saveAsPreset: true,
    });

    expect(presetsMock.save.calls.length).toBe(1);
    expect(presetsMock.save.calls[0][0]).toEqual({
      name: 'Upper Body',
      workoutType: 'strength',
      duration: 50,
      distanceKm: undefined,
      notes: undefined,
    });
  });
});
