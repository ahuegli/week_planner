import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-now-marker',
  standalone: true,
  template: `
    <div class="now-marker" role="separator" aria-label="Current time">
      <div class="now-line" aria-hidden="true"></div>
      <span class="now-badge">Now</span>
      <div class="now-line" aria-hidden="true"></div>
    </div>
  `,
  styles: `
    .now-marker {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 16px 0;
    }
    .now-line {
      flex: 1;
      height: 1px;
      background: rgba(45, 77, 122, 0.3);
    }
    .now-badge {
      flex-shrink: 0;
      background: var(--color-primary);
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      font-family: 'Inter', sans-serif;
      padding: 3px 12px;
      border-radius: 12px;
      letter-spacing: 0.03em;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NowMarkerComponent {}
