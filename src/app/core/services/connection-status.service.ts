import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ConnectionStatusService {
  private readonly _isBackendReachable = signal(true);
  private readonly _lastError = signal<string | null>(null);
  private readonly _retryCount = signal(0);

  readonly isBackendReachable = this._isBackendReachable.asReadonly();
  readonly lastError = this._lastError.asReadonly();
  readonly retryCount = this._retryCount.asReadonly();

  private retryTimeoutId: ReturnType<typeof setTimeout> | null = null;

  markBackendUnreachable(error: string): void {
    this._isBackendReachable.set(false);
    this._lastError.set(error);
    this._retryCount.update((count) => count + 1);
  }

  markBackendReachable(): void {
    this._isBackendReachable.set(true);
    this._lastError.set(null);
    this._retryCount.set(0);
    this.clearRetryTimeout();
  }

  scheduleRetry(callback: () => void, delayMs: number = 5000): void {
    this.clearRetryTimeout();
    this.retryTimeoutId = setTimeout(() => {
      callback();
    }, delayMs);
  }

  private clearRetryTimeout(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
  }
}
