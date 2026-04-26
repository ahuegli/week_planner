import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CalendarEvent } from '../models/app-data.models';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiBaseUrl;

@Injectable({ providedIn: 'root' })
export class CalendarEventApiService {
  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<CalendarEvent[]> {
    return this.http.get<CalendarEvent[]>(`${API_BASE}/calendar-events`);
  }

  getByDateRange(startDate: string, endDate: string): Observable<CalendarEvent[]> {
    const params = new HttpParams().set('startDate', startDate).set('endDate', endDate);
    return this.http.get<CalendarEvent[]>(`${API_BASE}/calendar-events`, { params });
  }

  create(event: Partial<CalendarEvent>): Observable<CalendarEvent> {
    return this.http.post<CalendarEvent>(`${API_BASE}/calendar-events`, event);
  }

  createMany(events: Partial<CalendarEvent>[]): Observable<CalendarEvent[]> {
    return this.http.post<CalendarEvent[]>(`${API_BASE}/calendar-events/batch`, events);
  }

  update(id: string, patch: Partial<CalendarEvent>): Observable<CalendarEvent> {
    return this.http.put<CalendarEvent>(`${API_BASE}/calendar-events/${id}`, patch);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/calendar-events/${id}`);
  }
}
