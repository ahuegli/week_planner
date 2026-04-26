import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CalendarEvent,
  ConflictCheckResult,
  ConflictMove,
  RescheduleConflictsResult,
  ScheduleEntirePlanResult,
  SchedulerGenerateResponse,
  SchedulerSettings,
} from '../models/app-data.models';

const API_BASE = environment.apiBaseUrl;

export interface ScoreSlotPayload {
  day: number;
  startMin: number;
  endMin: number;
  type: 'workout' | 'mealprep';
  existingEvents: CalendarEvent[];
  settings?: SchedulerSettings;
}

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

  score(payload: ScoreSlotPayload): Observable<{ score: number }> {
    return this.http.post<{ score: number }>(`${API_BASE}/scheduler/score`, payload);
  }

  checkConflicts(payload: {
    event: { date: string; startTime: string; endTime: string; type: string; commuteMinutes?: number };
    excludeEventId?: string;
  }): Observable<ConflictCheckResult> {
    return this.http.post<ConflictCheckResult>(`${API_BASE}/scheduler/check-conflicts`, payload);
  }

  applyConflicts(moves: ConflictMove[]): Observable<{ moved: number }> {
    return this.http.post<{ moved: number }>(`${API_BASE}/scheduler/apply-conflicts`, { moves });
  }
}