import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  RescheduleConflictsResult,
  ScheduleEntirePlanResult,
  SchedulerGenerateResponse,
} from '../models/app-data.models';

const API_BASE = 'http://localhost:3000/api/v1';

@Injectable({ providedIn: 'root' })
export class SchedulerApiService {
  constructor(private readonly http: HttpClient) {}

  generate(payload: unknown): Observable<SchedulerGenerateResponse> {
    return this.http.post<SchedulerGenerateResponse>(`${API_BASE}/scheduler/generate`, payload);
  }

  generatePlan(planId: string): Observable<ScheduleEntirePlanResult> {
    return this.http.post<ScheduleEntirePlanResult>(`${API_BASE}/scheduler/generate-plan`, { planId });
  }

  rescheduleConflicts(planId: string): Observable<RescheduleConflictsResult> {
    return this.http.post<RescheduleConflictsResult>(`${API_BASE}/scheduler/reschedule-conflicts`, {
      planId,
    });
  }
}