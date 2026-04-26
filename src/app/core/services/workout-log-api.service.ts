import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateWorkoutLogPayload, UpdateWorkoutLogPayload, WorkoutLog } from '../models/app-data.models';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiBaseUrl;

@Injectable({ providedIn: 'root' })
export class WorkoutLogApiService {
  constructor(private readonly http: HttpClient) {}

  create(payload: CreateWorkoutLogPayload): Observable<WorkoutLog> {
    return this.http.post<WorkoutLog>(`${API_BASE}/workout-logs`, payload);
  }

  getAll(): Observable<WorkoutLog[]> {
    return this.http.get<WorkoutLog[]>(`${API_BASE}/workout-logs`);
  }

  getOne(id: string): Observable<WorkoutLog> {
    return this.http.get<WorkoutLog>(`${API_BASE}/workout-logs/${id}`);
  }

  getByPlannedSession(sessionId: string): Observable<WorkoutLog | null> {
    return this.http.get<WorkoutLog | null>(`${API_BASE}/workout-logs/session/${sessionId}`);
  }

  update(id: string, payload: UpdateWorkoutLogPayload): Observable<WorkoutLog> {
    return this.http.put<WorkoutLog>(`${API_BASE}/workout-logs/${id}`, payload);
  }
}
