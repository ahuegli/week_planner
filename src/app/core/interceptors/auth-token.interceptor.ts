import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UiFeedbackService } from '../../shared/ui-feedback.service';
import { environment } from '../../../environments/environment';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }

  const authService = inject(AuthService);
  const router = inject(Router);
  const uiFeedback = inject(UiFeedbackService);
  const token = authService.token();

  const outgoing = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(outgoing).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && token) {
        const code = (err.error as { code?: string } | null)?.code;
        const message =
          code === 'TOKEN_EXPIRED'
            ? 'Your session has expired. Please log in again.'
            : code === 'USER_NOT_FOUND'
            ? 'Your account was not found. Please log in again.'
            : code === 'USER_DISABLED'
            ? 'Your account has been disabled. Please contact support.'
            : 'Your session has expired. Please log in again.';

        authService.logout();
        uiFeedback.show(message, 4000);
        void router.navigate(['/login']);
      }
      return throwError(() => err);
    }),
  );
};
