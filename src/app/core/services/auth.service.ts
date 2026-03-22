import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  name?: string;
}

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = 'http://localhost:3000/api/v1/auth';

  private readonly _token = signal<string | null>(this.getStoredToken());
  private readonly _user = signal<User | null>(this.getStoredUser());
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly token = this._token.asReadonly();
  readonly user = this._user.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token());

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {}

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    this._loading.set(true);
    this._error.set(null);

    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response) => {
        this.handleAuthSuccess(response);
        this._loading.set(false);
      }),
      catchError((error) => {
        this._loading.set(false);
        const message = error.error?.message || 'Login failed. Please try again.';
        this._error.set(message);
        return throwError(() => error);
      }),
    );
  }

  register(credentials: RegisterCredentials): Observable<AuthResponse> {
    this._loading.set(true);
    this._error.set(null);

    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, credentials).pipe(
      tap((response) => {
        this.handleAuthSuccess(response);
        this._loading.set(false);
      }),
      catchError((error) => {
        this._loading.set(false);
        const message = error.error?.message || 'Registration failed. Please try again.';
        this._error.set(message);
        return throwError(() => error);
      }),
    );
  }

  logout(): void {
    this._token.set(null);
    this._user.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.router.navigate(['/login']);
  }

  clearError(): void {
    this._error.set(null);
  }

  private handleAuthSuccess(response: AuthResponse): void {
    this._token.set(response.access_token);
    this._user.set(response.user);
    localStorage.setItem(TOKEN_KEY, response.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
  }

  private getStoredToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private getStoredUser(): User | null {
    const userJson = localStorage.getItem(USER_KEY);
    if (userJson) {
      try {
        return JSON.parse(userJson);
      } catch {
        return null;
      }
    }
    return null;
  }
}
