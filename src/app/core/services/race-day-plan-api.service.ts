import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RaceDayPlan, UpdateRaceDayPlanPayload } from '../models/app-data.models';

const BASE = `${environment.apiBaseUrl}/race-day-plans`;

@Injectable({ providedIn: 'root' })
export class RaceDayPlanApiService {
  constructor(private readonly http: HttpClient) {}

  getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const payload = error.error;
      if (typeof payload === 'string' && payload.trim()) {
        return payload;
      }
      if (payload && typeof payload === 'object' && 'message' in payload) {
        const message = (payload as { message?: unknown }).message;
        if (Array.isArray(message)) {
          return message.map((item) => String(item)).join(', ');
        }
        if (typeof message === 'string' && message.trim()) {
          return message;
        }
      }
      if (error.message) {
        return error.message;
      }
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'Could not generate race-day plan. Please try again.';
  }

  getForPlan(planId: string): Observable<RaceDayPlan> {
    return this.http.get<RaceDayPlan>(`${BASE}/plan/${planId}`);
  }

  generate(planId: string): Observable<RaceDayPlan> {
    return this.http.post<RaceDayPlan>(`${BASE}/generate/${planId}`, {});
  }

  update(id: string, dto: UpdateRaceDayPlanPayload): Observable<RaceDayPlan> {
    return this.http.put<RaceDayPlan>(`${BASE}/${id}`, dto);
  }
}
