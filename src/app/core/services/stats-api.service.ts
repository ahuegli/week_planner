import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SportStats, StreakStats, StatsSummary, WeeklyStats } from '../models/app-data.models';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiBaseUrl}/stats`;

@Injectable({ providedIn: 'root' })
export class StatsApiService {
  constructor(private readonly http: HttpClient) {}

  getSummary() {
    return this.http.get<StatsSummary>(`${BASE}/summary`);
  }

  getWeekly() {
    return this.http.get<WeeklyStats>(`${BASE}/weekly`);
  }

  getStreaks() {
    return this.http.get<StreakStats>(`${BASE}/streaks`);
  }

  getSportStats(sport: string) {
    return this.http.get<SportStats>(`${BASE}/sport/${sport}`);
  }
}
