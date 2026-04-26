import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateSymptomLogPayload, SymptomLog, UpdateSymptomLogPayload } from '../models/app-data.models';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiBaseUrl;

@Injectable({ providedIn: 'root' })
export class SymptomLogApiService {
  constructor(private readonly http: HttpClient) {}

  list(startDate?: string, endDate?: string): Observable<SymptomLog[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return this.http.get<SymptomLog[]>(`${API_BASE}/symptom-logs`, { params });
  }

  today(): Observable<SymptomLog | null> {
    return this.http.get<SymptomLog | null>(`${API_BASE}/symptom-logs/today`);
  }

  create(dto: CreateSymptomLogPayload): Observable<SymptomLog> {
    return this.http.post<SymptomLog>(`${API_BASE}/symptom-logs`, dto);
  }

  update(id: string, dto: UpdateSymptomLogPayload): Observable<SymptomLog> {
    return this.http.put<SymptomLog>(`${API_BASE}/symptom-logs/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/symptom-logs/${id}`);
  }
}
