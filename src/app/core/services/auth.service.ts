import { computed, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthResponse {
  access_token: string;
  user: AuthUser;
}

const AUTH_API_BASE = `${environment.apiBaseUrl}/auth`;
const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly token = signal<string | null>(null);
  readonly currentUser = signal<AuthUser | null>(null);
  readonly isAuthenticated = computed(() => !!this.token());

  constructor(private readonly http: HttpClient) {
    this.restoreSession();
  }

  register(email: string, password: string, name: string) {
    return this.http
      .post<AuthResponse>(`${AUTH_API_BASE}/register`, { email, password, name })
      .pipe(tap((response) => this.persistSession(response)));
  }

  login(email: string, password: string) {
    return this.http
      .post<AuthResponse>(`${AUTH_API_BASE}/login`, { email, password })
      .pipe(tap((response) => this.persistSession(response)));
  }

  logout(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    this.token.set(null);
    this.currentUser.set(null);
  }

  private restoreSession(): void {
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    const storedUser = localStorage.getItem(AUTH_USER_KEY);

    if (!storedToken || !storedUser) {
      this.logout();
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser) as AuthUser;
      this.token.set(storedToken);
      this.currentUser.set(parsedUser);
    } catch {
      this.logout();
    }
  }

  private persistSession(response: AuthResponse): void {
    localStorage.setItem(AUTH_TOKEN_KEY, response.access_token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.user));
    this.token.set(response.access_token);
    this.currentUser.set(response.user);
  }
}
