import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { WeekDay } from '../../../core/models/app-data.models';

@Component({
  selector: 'app-week-snapshot',
  standalone: true,
  templateUrl: './week-snapshot.component.html',
  styleUrl: './week-snapshot.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeekSnapshotComponent {
  readonly days = input.required<WeekDay[]>();
  readonly daySelected = output<string>();

  protected onSelect(day: WeekDay): void {
    if (!day.date) {
      return;
    }

    this.daySelected.emit(day.date);
  }
}
