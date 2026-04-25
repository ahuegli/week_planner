import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

@Component({
  selector: 'app-reminder-card',
  standalone: true,
  templateUrl: './reminder-card.component.html',
  styleUrl: './reminder-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReminderCardComponent {
  readonly text = input.required<string>();

  protected readonly dismissed = signal(false);

  protected dismiss(): void {
    this.dismissed.set(true);
  }
}
