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
    settings: signal(DEFAULT_SETTINGS),
    unplacedWorkouts: signal([]),
    optimizationProposal: signal(null),
    generateSuggestedPlan: createCallRecorder(),
    removeEvent: createCallRecorder(),
    updateSettings: createCallRecorder(),
    clearOptimizationProposal: createCallRecorder(),
    addWorkout: createCallRecorder(),
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

  it('should keep workout quick add inline without rendering the temporary recent-workout palette', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.showWeekView();
    fixture.detectChanges();

    app.onWorkoutAdded({
      type: 'running',
      sessionName: 'Tempo Run',
      duration: 45,
      timeframe: 2,
      distance: 10,
    });
    fixture.detectChanges();

    expect(plannerMock.addWorkout.calls).toEqual([['running', 'Tempo Run', 45, 2, 10]]);
    expect(app.showWorkoutCard()).toBe(false);
    expect(fixture.nativeElement.querySelector('.recent-workouts')).toBeNull();
  });
});
