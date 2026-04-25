import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { PlanMode } from '../../../core/models/app-data.models';

@Component({
  selector: 'app-create-plan-cta',
  imports: [],
  templateUrl: './create-plan-cta.component.html',
  styleUrl: './create-plan-cta.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreatePlanCtaComponent {
  readonly hasSavedSettings = input(false);
  readonly quickSwitchRequested = output<void>();

  private readonly router = inject(Router);

  protected createPlan(mode: PlanMode): void {
    if (this.hasSavedSettings()) {
      this.quickSwitchRequested.emit();
      return;
    }

    if (mode === 'race') {
      console.log('Start onboarding with goal: race');
      void this.router.navigate(['/onboarding'], { queryParams: { goal: 'race' } });
      return;
    }

    if (mode === 'general_fitness') {
      console.log('Start onboarding with goal: fitness');
      void this.router.navigate(['/onboarding'], { queryParams: { goal: 'fitness' } });
      return;
    }

    console.log('Start onboarding with goal: weight_loss');
    void this.router.navigate(['/onboarding'], { queryParams: { goal: 'weight_loss' } });
  }
}
