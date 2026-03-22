import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CalendarEvent } from '../models/calendar-event.model';

export interface CreateCalendarEventDto {
  title: string;
  type: 'shift' | 'workout' | 'mealprep' | 'custom-event';
  day: number;
  date?: string;
  startTime: string;
  endTime: string;
  durationMinutes?: number;
  shiftType?: string;
  workoutType?: string;
  distanceKm?: number;
  isLocked?: boolean;
  isPersonal?: boolean;
  isManuallyPlaced?: boolean;
  isRepeatingWeekly?: boolean;
  commuteMinutes?: number;
  notes?: string;
}

export interface UpdateCalendarEventDto extends Partial<CreateCalendarEventDto> {}

@Injectable({
  providedIn: 'root',
})
export class CalendarEventApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/calendar-events';

  /**
   * Get all events for the authenticated user
   */
  getAll(): Observable<CalendarEvent[]> {
    return this.http.get<CalendarEvent[]>(this.baseUrl);
  }

  /**
   * Get events within a date range
   */
  getByDateRange(startDate: string, endDate: string): Observable<CalendarEvent[]> {
    return this.http.get<CalendarEvent[]>(this.baseUrl, {
      params: { startDate, endDate },
    });
  }

  /**
   * Get a single event by ID
   */
  getOne(id: string): Observable<CalendarEvent> {
    return this.http.get<CalendarEvent>(`${this.baseUrl}/${id}`);
  }

  /**
   * Create a new event
   */
  create(dto: CreateCalendarEventDto): Observable<CalendarEvent> {
    return this.http.post<CalendarEvent>(this.baseUrl, dto);
  }

  /**
   * Create multiple events at once
   */
  createMany(dtos: CreateCalendarEventDto[]): Observable<CalendarEvent[]> {
    return this.http.post<CalendarEvent[]>(`${this.baseUrl}/batch`, dtos);
  }

  /**
   * Update an existing event
   */
  update(id: string, dto: UpdateCalendarEventDto): Observable<CalendarEvent> {
    return this.http.put<CalendarEvent>(`${this.baseUrl}/${id}`, dto);
  }

  /**
   * Delete an event
   */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /**
   * Delete events within a date range
   */
  deleteByDateRange(startDate: string, endDate: string): Observable<void> {
    return this.http.delete<void>(this.baseUrl, {
      params: { startDate, endDate },
    });
  }

  /**
   * Replace all events for the user
   */
  replaceAll(dtos: CreateCalendarEventDto[]): Observable<CalendarEvent[]> {
    return this.http.put<CalendarEvent[]>(`${this.baseUrl}/replace-all`, dtos);
  }
}
