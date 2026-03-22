import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Workout, WorkoutType } from '../models/workout.model';

export interface CreateWorkoutDto {
  name: string;
  workoutType: WorkoutType;
  duration: number;
  frequencyPerWeek: number;
  distanceKm?: number;
}

export interface UpdateWorkoutDto {
  name?: string;
  workoutType?: WorkoutType;
  duration?: number;
  frequencyPerWeek?: number;
  distanceKm?: number;
}

@Injectable({
  providedIn: 'root',
})
export class WorkoutApiService {
  private readonly apiUrl = 'http://localhost:3000/api/v1/workouts';

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Workout[]> {
    return this.http.get<Workout[]>(this.apiUrl);
  }

  getOne(id: string): Observable<Workout> {
    return this.http.get<Workout>(`${this.apiUrl}/${id}`);
  }

  create(dto: CreateWorkoutDto): Observable<Workout> {
    return this.http.post<Workout>(this.apiUrl, dto);
  }

  update(id: string, dto: UpdateWorkoutDto): Observable<Workout> {
    return this.http.put<Workout>(`${this.apiUrl}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
