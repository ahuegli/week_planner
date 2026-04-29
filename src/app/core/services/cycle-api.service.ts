import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CycleCurrentPhase,
  CycleCurrentPhaseApiResponse,
  CycleProfile,
} from '../models/app-data.models';

const API_BASE = environment.apiBaseUrl;

@Injectable({ providedIn: 'root' })
export class CycleApiService {
  constructor(private readonly http: HttpClient) {}

  getProfile(): Observable<CycleProfile> {
    return this.http.get<CycleProfile>(`${API_BASE}/cycle`);
  }

  updateProfile(patch: Partial<CycleProfile>): Observable<CycleProfile> {
    return this.http.put<CycleProfile>(`${API_BASE}/cycle`, patch);
  }

  logPeriod(date: string): Observable<CycleProfile> {
    return this.http.post<CycleProfile>(`${API_BASE}/cycle/log-period`, { date });
  }

  getCurrentPhase(): Observable<CycleCurrentPhase> {
    return this.http
      .get<CycleCurrentPhaseApiResponse>(`${API_BASE}/cycle/current-phase`)
      .pipe(
        map((response) => ({
          phase: response.phase,
          day: response.cycleDay ?? 0,
          cycleLengthDays: response.averageCycleLength,
          mode: response.mode,
        })),
      );
  }
}
