import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateEnergyCheckInPayload, EnergyCheckIn, UpdateEnergyCheckInPayload } from '../models/app-data.models';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiBaseUrl;

@Injectable({ providedIn: 'root' })
export class EnergyCheckInApiService {
  constructor(private readonly http: HttpClient) {}

  list(startDate?: string, endDate?: string): Observable<EnergyCheckIn[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return this.http.get<EnergyCheckIn[]>(`${API_BASE}/energy-check-ins`, { params });
  }

  today(): Observable<EnergyCheckIn | null> {
    return this.http.get<EnergyCheckIn | null>(`${API_BASE}/energy-check-ins/today`);
  }

  create(dto: CreateEnergyCheckInPayload): Observable<EnergyCheckIn> {
    return this.http.post<EnergyCheckIn>(`${API_BASE}/energy-check-ins`, dto);
  }

  update(id: string, dto: UpdateEnergyCheckInPayload): Observable<EnergyCheckIn> {
    return this.http.put<EnergyCheckIn>(`${API_BASE}/energy-check-ins/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/energy-check-ins/${id}`);
  }
}
