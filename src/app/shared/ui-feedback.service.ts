import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UiFeedbackService {
  readonly message = signal<string | null>(null);

  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  show(message: string, duration = 2600): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    this.message.set(message);
    this.hideTimer = setTimeout(() => {
      this.message.set(null);
      this.hideTimer = null;
    }, duration);
  }

  clear(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    this.message.set(null);
  }
}