import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RaceDayPlan, UpdateRaceDayPlanPayload } from '../models/app-data.models';

const BASE = `${environment.apiBaseUrl}/race-day-plans`;

@Injectable({ providedIn: 'root' })
export class RaceDayPlanApiService {
  constructor(private readonly http: HttpClient) {}

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
