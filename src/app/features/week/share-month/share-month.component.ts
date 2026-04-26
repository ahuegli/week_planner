import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-share-month',
  imports: [],
  templateUrl: './share-month.component.html',
  styleUrl: './share-month.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShareMonthComponent {
  protected shareSchedule(): void {
  }
}
