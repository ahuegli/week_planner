import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-share-month',
  imports: [],
  templateUrl: './share-month.component.html',
  styleUrl: './share-month.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShareMonthComponent {
  private readonly router = inject(Router);

  protected shareSchedule(): void {
    void this.router.navigate(['/settings'], { queryParams: { open: 'sharing' } });
  }
}
