import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ConnectionStatusService } from '../services/connection-status.service';

export const connectionErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const connectionStatus = inject(ConnectionStatusService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Check if this is a connection error (network failure, server unreachable)
      if (isConnectionError(error)) {
        connectionStatus.markBackendUnreachable(getErrorMessage(error));
      } else if (error.status >= 200 && error.status < 500) {
        // If we get a response (even an error response), the backend is reachable
        connectionStatus.markBackendReachable();
      }

      return throwError(() => error);
    }),
  );
};

function isConnectionError(error: HttpErrorResponse): boolean {
  // status 0 typically indicates network failure (CORS, no connection, etc.)
  // status 502, 503, 504 indicate server/gateway issues
  return error.status === 0 || error.status === 502 || error.status === 503 || error.status === 504;
}

function getErrorMessage(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'Unable to connect to the server. Please check your network connection.';
  }
  if (error.status === 502) {
    return 'Bad Gateway: The server received an invalid response.';
  }
  if (error.status === 503) {
    return 'Service Unavailable: The server is temporarily overloaded or down.';
  }
  if (error.status === 504) {
    return 'Gateway Timeout: The server took too long to respond.';
  }
  return 'Connection error: Unable to reach the backend.';
}
