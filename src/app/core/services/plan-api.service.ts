import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PlanCreatePayload,
  PlannedSession,
  PlanUpdatePayload,
  PlanWeek,
  SkipSessionResponse,
  TrainingPlan,
  WeeklyProgress,
} from '../models/app-data.models';

const API_BASE = environment.apiBaseUrl;

@Injectable({ providedIn: 'root' })
export class PlanApiService {
  private readonly baseUrl = API_BASE;

  constructor(private readonly http: HttpClient) {}

  getPlans(): Observable<TrainingPlan[]> {
    return this.http.get<TrainingPlan[]>(`${API_BASE}/plans`);
  }

  getPlan(id: string): Observable<TrainingPlan> {
    return this.http.get<TrainingPlan>(`${API_BASE}/plans/${id}`);
  }

  createPlan(plan: PlanCreatePayload): Observable<TrainingPlan> {
    return this.http.post<TrainingPlan>(`${API_BASE}/plans`, plan);
  }

  generatePlanTemplate(planId: string) {
    return this.http.post(`${this.baseUrl}/plans/${planId}/generate`, {});
  }

  updatePlan(id: string, patch: PlanUpdatePayload): Observable<TrainingPlan> {
    return this.http.put<TrainingPlan>(`${API_BASE}/plans/${id}`, patch);
  }

  deletePlan(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/plans/${id}`);
  }

  getWeeks(planId: string): Observable<PlanWeek[]> {
    return this.http.get<PlanWeek[]>(`${API_BASE}/plans/${planId}/weeks`);
  }

  getWeekSessions(planId: string, weekNum: number): Observable<PlannedSession[]> {
    return this.http.get<PlannedSession[]>(`${API_BASE}/sessions/${planId}/week/${weekNum}`);
  }

  completeSession(id: string, energyRating: 'easy' | 'moderate' | 'hard'): Observable<PlannedSession> {
    return this.http.put<PlannedSession>(`${API_BASE}/sessions/${id}/complete`, { energyRating });
  }

  scheduleSession(id: string, preferredDay?: number): Observable<PlannedSession> {
    return this.http.put<PlannedSession>(`${API_BASE}/sessions/${id}/schedule`, { preferredDay });
  }

  scheduleSessionNow(id: string, date: string, startTime: string): Observable<PlannedSession> {
    return this.http.put<PlannedSession>(`${API_BASE}/sessions/${id}/schedule-now`, { date, startTime });
  }

  skipSession(id: string): Observable<SkipSessionResponse> {
    return this.http.put<SkipSessionResponse>(`${API_BASE}/sessions/${id}/skip`, {});
  }

  moveSession(id: string, targetDay: string): Observable<PlannedSession> {
    return this.http.put<PlannedSession>(`${API_BASE}/sessions/${id}/move`, { targetDay });
  }

  getProgress(planId: string): Observable<WeeklyProgress[]> {
    return this.http.get<WeeklyProgress[]>(`${API_BASE}/progress/${planId}`);
  }

  getCurrentProgress(planId: string): Observable<WeeklyProgress | null> {
    return this.http.get<WeeklyProgress | null>(`${API_BASE}/progress/${planId}/current`);
  }
}
