import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Workout } from '../models/app-data.models';

const API_BASE = 'http://localhost:3000/api/v1';

@Injectable({ providedIn: 'root' })
export class WorkoutApiService {
  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Workout[]> {
    return this.http.get<Workout[]>(`${API_BASE}/workouts`);
  }

  create(workout: Partial<Workout>): Observable<Workout> {
    return this.http.post<Workout>(`${API_BASE}/workouts`, workout);
  }

  update(id: string, patch: Partial<Workout>): Observable<Workout> {
    return this.http.put<Workout>(`${API_BASE}/workouts/${id}`, patch);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/workouts/${id}`);
  }
}
