import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SuggestedAction {
  type: 'reschedule' | 'skip' | 'swap' | 'note';
  description: string;
  sessionId?: string;
  newValues?: Record<string, unknown>;
}

export interface CoachChatResponse {
  reply: string;
  suggestedAction?: SuggestedAction;
}

@Injectable({ providedIn: 'root' })
export class CoachApiService {
  private readonly http = inject(HttpClient);

  chat(messages: ChatMessage[], context?: string): Observable<CoachChatResponse> {
    return this.http.post<CoachChatResponse>(`${environment.apiBaseUrl}/coach/chat`, {
      messages,
      context,
    });
  }
}
