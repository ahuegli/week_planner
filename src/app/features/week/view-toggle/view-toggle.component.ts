import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type WeekViewMode = 'week' | 'month';

@Component({
  selector: 'app-view-toggle',
  imports: [],
  templateUrl: './view-toggle.component.html',
  styleUrl: './view-toggle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewToggleComponent {
  readonly value = input.required<WeekViewMode>();
  readonly valueChange = output<WeekViewMode>();

  protected setValue(next: WeekViewMode): void {
    this.valueChange.emit(next);
  }
}
