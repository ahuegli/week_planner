import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CalendarEvent,
  CalendarShare,
  CreateCalendarSharePayload,
  UpdateCalendarSharePayload,
} from '../models/app-data.models';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiBaseUrl;

@Injectable({ providedIn: 'root' })
export class CalendarShareApiService {
  constructor(private readonly http: HttpClient) {}

  listOutgoing(): Observable<CalendarShare[]> {
    return this.http.get<CalendarShare[]>(`${API_BASE}/calendar-shares/outgoing`);
  }

  listIncoming(): Observable<CalendarShare[]> {
    return this.http.get<CalendarShare[]>(`${API_BASE}/calendar-shares/incoming`);
  }

  create(payload: CreateCalendarSharePayload): Observable<CalendarShare> {
    return this.http.post<CalendarShare>(`${API_BASE}/calendar-shares`, payload);
  }

  update(id: string, payload: UpdateCalendarSharePayload): Observable<CalendarShare> {
    return this.http.put<CalendarShare>(`${API_BASE}/calendar-shares/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/calendar-shares/${id}`);
  }

  getSharedCalendar(ownerId: string, startDate?: string, endDate?: string): Observable<CalendarEvent[]> {
    const params = startDate && endDate ? `?startDate=${startDate}&endDate=${endDate}` : '';
    return this.http.get<CalendarEvent[]>(`${API_BASE}/calendar-events/shared/${ownerId}${params}`);
  }
}
