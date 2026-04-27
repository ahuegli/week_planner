import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  EventInvitation,
  CreateEventInvitationPayload,
  RespondToInvitationPayload,
} from '../models/app-data.models';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiBaseUrl;

@Injectable({ providedIn: 'root' })
export class EventInvitationApiService {
  constructor(private readonly http: HttpClient) {}

  listIncoming(): Observable<EventInvitation[]> {
    return this.http.get<EventInvitation[]>(`${API_BASE}/event-invitations/incoming`);
  }

  listOutgoing(): Observable<EventInvitation[]> {
    return this.http.get<EventInvitation[]>(`${API_BASE}/event-invitations/outgoing`);
  }

  create(payload: CreateEventInvitationPayload): Observable<EventInvitation> {
    return this.http.post<EventInvitation>(`${API_BASE}/event-invitations`, payload);
  }

  respond(id: string, payload: RespondToInvitationPayload): Observable<EventInvitation> {
    return this.http.put<EventInvitation>(`${API_BASE}/event-invitations/${id}/respond`, payload);
  }

  cancel(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/event-invitations/${id}`);
  }
}
