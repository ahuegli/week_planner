import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { DEFAULT_SETTINGS } from './core/models/scheduler-settings.model';
import { PlannerService } from './core/services/planner.service';

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
  };
}

describe('App', () => {
  let plannerMock: ReturnType<typeof createPlannerMock>;

  beforeEach(async () => {
    localStorage.clear();
    plannerMock = createPlannerMock();

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: PlannerService, useValue: plannerMock }],
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

    app.showWeekView();
    app.openWorkoutDialog();
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

    expect(app.workoutPresets().length).toBe(1);
    expect(app.workoutPresets()[0].name).toBe('Upper Body');
  });
});
