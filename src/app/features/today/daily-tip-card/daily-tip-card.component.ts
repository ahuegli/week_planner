import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { DailyTip } from '../../../mock-data';

@Component({
  selector: 'app-daily-tip-card',
  standalone: true,
  templateUrl: './daily-tip-card.component.html',
  styleUrl: './daily-tip-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DailyTipCardComponent {
  readonly tip = input.required<DailyTip>();

  protected readonly expanded = signal(false);

  protected toggle(): void {
    this.expanded.update(v => !v);
  }
}
