import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateNotePayload, Note, UpdateNotePayload } from '../models/app-data.models';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiBaseUrl;

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

  getSubTasks(parentNoteId: string): Observable<Note[]> {
    return this.http.get<Note[]>(`${API_BASE}/notes/${parentNoteId}/sub-tasks`);
  }

  claimSubTask(noteId: string): Observable<Note> {
    return this.http.post<Note>(`${API_BASE}/notes/${noteId}/claim`, {});
  }

  unassignSubTask(noteId: string): Observable<Note> {
    return this.http.post<Note>(`${API_BASE}/notes/${noteId}/unassign`, {});
  }

  updateSubTaskStatus(
    noteId: string,
    status: 'not_started' | 'in_progress' | 'done',
  ): Observable<Note> {
    return this.http.put<Note>(`${API_BASE}/notes/${noteId}/subtask-status`, { status });
  }
}
