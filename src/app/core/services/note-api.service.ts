import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateNotePayload, Note, UpdateNotePayload } from '../models/app-data.models';

const API_BASE = 'http://localhost:3000/api/v1';

@Injectable({ providedIn: 'root' })
export class NoteApiService {
  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Note[]> {
    return this.http.get<Note[]>(`${API_BASE}/notes`);
  }

  getOne(id: string): Observable<Note> {
    return this.http.get<Note>(`${API_BASE}/notes/${id}`);
  }

  create(payload: CreateNotePayload): Observable<Note> {
    return this.http.post<Note>(`${API_BASE}/notes`, payload);
  }

  update(id: string, payload: UpdateNotePayload): Observable<Note> {
    return this.http.put<Note>(`${API_BASE}/notes/${id}`, payload);
  }

  toggleComplete(id: string, completed: boolean): Observable<Note> {
    return this.http.put<Note>(`${API_BASE}/notes/${id}/complete`, { completed });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/notes/${id}`);
  }
}
