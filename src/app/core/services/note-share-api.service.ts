import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { NoteShare, CreateNoteSharePayload } from '../models/app-data.models';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiBaseUrl;

@Injectable({ providedIn: 'root' })
export class NoteShareApiService {
  constructor(private readonly http: HttpClient) {}

  listOutgoing(): Observable<NoteShare[]> {
    return this.http.get<NoteShare[]>(`${API_BASE}/note-shares/outgoing`);
  }

  listIncoming(): Observable<NoteShare[]> {
    return this.http.get<NoteShare[]>(`${API_BASE}/note-shares/incoming`);
  }

  create(payload: CreateNoteSharePayload): Observable<NoteShare> {
    return this.http.post<NoteShare>(`${API_BASE}/note-shares`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/note-shares/${id}`);
  }
}
