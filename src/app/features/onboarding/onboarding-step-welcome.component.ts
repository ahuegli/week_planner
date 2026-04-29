import { ChangeDetectionStrategy, Component, output } from '@angular/core';

@Component({
  selector: 'app-onboarding-step-welcome',
  imports: [],
  template: `
    <section class="step-wrap">
      <h1 class="step-title welcome-title">Welcome to Week Planner</h1>
      <p class="step-subtitle">Let's set up your schedule in a few minutes</p>
      <button type="button" class="btn-primary step-cta" (click)="started.emit()">Get Started</button>
    </section>
  `,
  styles: `
    .step-wrap { display: flex; flex-direction: column; gap: 16px; }
    .welcome-title { margin-top: 12px; }
    .step-cta { margin-top: 10px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingStepWelcomeComponent {
  readonly started = output<void>();
}
