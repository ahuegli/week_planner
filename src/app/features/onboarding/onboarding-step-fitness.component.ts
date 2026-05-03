import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { OnboardingData } from './onboarding.models';

type FitnessLevel = 'novice' | 'beginner' | 'intermediate' | 'advanced';

const LEVEL_OPTIONS: { value: FitnessLevel; label: string; sub: string }[] = [
  { value: 'novice', label: 'Novice', sub: 'Less than 6 months of consistent training' },
  { value: 'beginner', label: 'Beginner', sub: '6–18 months, completed at least one race or event' },
  { value: 'intermediate', label: 'Intermediate', sub: '18+ months, multiple races, established weekly routine' },
  { value: 'advanced', label: 'Advanced', sub: '3+ years, structured intensity work, competitive for age group' },
];

@Component({
  selector: 'app-onboarding-step-fitness',
  imports: [],
  template: `
    <section class="step-wrap">
      <h2 class="step-title">How would you describe your training experience?</h2>
      <p class="step-subtitle">We'll calibrate long run distances, weekly volume, and progression rates</p>

      <div class="level-grid">
        @for (opt of levelOptions; track opt.value) {
          <button
            type="button"
            class="level-card"
            [class.selected]="data().fitnessLevel === opt.value"
            (click)="select(opt.value)"
          >
            <span class="level-label">{{ opt.label }}</span>
            <span class="level-sub">{{ opt.sub }}</span>
          </button>
        }
      </div>

      <button type="button" class="btn-primary step-cta" [disabled]="!data().fitnessLevel" (click)="next.emit()">Next</button>
    </section>
  `,
  styles: `
    .step-wrap { display: flex; flex-direction: column; gap: 14px; }
    .level-grid { display: flex; flex-direction: column; gap: 8px; }
    .level-card {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 3px;
      padding: 14px 16px;
      border: 1px solid var(--color-border);
      border-radius: 10px;
      background: var(--color-card);
      cursor: pointer;
      text-align: left;
      transition: border-color 0.15s, background 0.15s;
    }
    .level-card.selected { border-color: var(--color-primary); background: rgba(45, 77, 122, 0.08); }
    .level-label { font-size: 15px; font-weight: 600; color: var(--color-text); }
    .level-card.selected .level-label { color: var(--color-primary); }
    .level-sub { font-size: 12px; color: var(--color-text-secondary); line-height: 1.4; }
    .step-cta { margin-top: 4px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingStepFitnessComponent {
  readonly data = input.required<OnboardingData>();
  readonly dataChange = output<Partial<OnboardingData>>();
  readonly next = output<void>();

  protected readonly levelOptions = LEVEL_OPTIONS;

  protected select(value: FitnessLevel): void {
    this.dataChange.emit({ fitnessLevel: value });
  }
}
