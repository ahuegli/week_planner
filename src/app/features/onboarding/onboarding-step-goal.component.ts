import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { GoalMode } from './onboarding.models';

@Component({
  selector: 'app-onboarding-step-goal',
  imports: [],
  template: `
    <section class="step-wrap">
      <h2 class="step-title">What are you training for?</h2>
      <p class="step-subtitle">This helps us build the right plan for you</p>

      <div class="option-list">
        <button type="button" class="option-card" [class.selected]="goal() === 'race'" (click)="select('race')">
          <div>
            <p class="option-title">Prepare for a race</p>
            <p class="option-subtitle">Marathon, triathlon, cycling event, or other competition</p>
          </div>
        </button>

        <button type="button" class="option-card" [class.selected]="goal() === 'fitness'" (click)="select('fitness')">
          <div>
            <p class="option-title">Stay fit & healthy</p>
            <p class="option-subtitle">Build strength, maintain fitness, stay active</p>
          </div>
        </button>

        <button type="button" class="option-card" [class.selected]="goal() === 'weight_loss'" (click)="select('weight_loss')">
          <div>
            <p class="option-title">Weight management</p>
            <p class="option-subtitle">Combine training with nutrition goals</p>
          </div>
        </button>
      </div>

      <button type="button" class="btn-primary step-cta" [disabled]="!goal()" (click)="next.emit()">Next</button>
    </section>
  `,
  styles: `
    .step-wrap { display: flex; flex-direction: column; gap: 14px; }
    .option-list { display: flex; flex-direction: column; gap: 10px; }
    .option-card {
      min-height: 72px;
      border: 1px solid var(--color-border);
      border-radius: 12px;
      padding: 12px;
      background: var(--color-card);
      text-align: left;
      cursor: pointer;
    }
    .option-card.selected { border-color: var(--color-primary); box-shadow: inset 0 0 0 1px var(--color-primary); }
    .option-title { font-size: 15px; font-weight: 600; color: var(--color-text); }
    .option-subtitle { margin-top: 4px; font-size: 12px; color: var(--color-text-secondary); }
    .step-cta { margin-top: 6px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingStepGoalComponent {
  readonly goal = input<GoalMode>(null);
  readonly goalChange = output<GoalMode>();
  readonly next = output<void>();

  protected select(mode: GoalMode): void {
    this.goalChange.emit(mode);
  }
}
