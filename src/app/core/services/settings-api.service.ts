import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MealprepSettings, SchedulerSettings } from '../models/app-data.models';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiBaseUrl;

@Injectable({ providedIn: 'root' })
export class SettingsApiService {
  constructor(private readonly http: HttpClient) {}

  getSchedulerSettings(): Observable<SchedulerSettings> {
    return this.http.get<SchedulerSettings>(`${API_BASE}/scheduler-settings`);
  }

  updateSchedulerSettings(patch: Partial<SchedulerSettings>): Observable<SchedulerSettings> {
    return this.http.put<SchedulerSettings>(`${API_BASE}/scheduler-settings`, patch);
  }

  getMealprepSettings(): Observable<MealprepSettings> {
    return this.http.get<MealprepSettings>(`${API_BASE}/mealprep-settings`);
  }

  updateMealprepSettings(patch: Partial<MealprepSettings>): Observable<MealprepSettings> {
    return this.http.put<MealprepSettings>(`${API_BASE}/mealprep-settings`, patch);
  }
}
