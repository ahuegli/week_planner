import { of } from 'rxjs';
import { DEFAULT_SETTINGS } from '../models/scheduler-settings.model';
import { PlannerService } from './planner.service';
import { GenerateScheduleRequest, GenerateScheduleResponse } from './scheduler-api.service';

describe('PlannerService', () => {
  let generateRequests: GenerateScheduleRequest[];
  let service: PlannerService;

  const emptyResponse: GenerateScheduleResponse = {
    placedEvents: [],
    unplacedWorkouts: [],
    totalScore: 0,
    placedWorkoutCount: 0,
    placedLongWorkoutCount: 0,
    weightedWorkoutScore: 0,
  };

  beforeEach(() => {
    generateRequests = [];
    service = new PlannerService({
      generate: (request: GenerateScheduleRequest) => {
        generateRequests.push(request);
        return of(emptyResponse);
      },
    } as never);
  });

  it('should omit meal prep generation when settings disable it even if sessions exist', async () => {
    service.addMealPrepSession('Sunday Prep', 60, 1, 3);
    service.updateSettings({ ...DEFAULT_SETTINGS, mealPrepSessionsPerWeek: 0 });

    await service.generateSuggestedPlan();

    const request = generateRequests.at(-1)!;

    expect(request.mealPrep).toEqual({
      sessionsPerWeek: 0,
      duration: 60,
    });
  });

  it('should fall back to configured meal prep sessions when no custom meal prep sessions exist', async () => {
    service.updateSettings({ ...DEFAULT_SETTINGS, mealPrepSessionsPerWeek: 2 });

    await service.generateSuggestedPlan();

    const request = generateRequests.at(-1)!;

    expect(request.mealPrep).toEqual({
      sessionsPerWeek: 2,
      duration: 90,
    });
  });
});