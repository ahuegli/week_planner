import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ConnectionStatusService } from '../../../core/services/connection-status.service';

@Component({
  selector: 'app-connection-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './connection-banner.component.html',
  styleUrl: './connection-banner.component.scss',
})
export class ConnectionBannerComponent {
  private readonly connectionStatus = inject(ConnectionStatusService);

  readonly isBackendReachable = this.connectionStatus.isBackendReachable;
  readonly lastError = this.connectionStatus.lastError;
  readonly retryCount = this.connectionStatus.retryCount;

  dismiss(): void {
    this.connectionStatus.markBackendReachable();
  }
}
