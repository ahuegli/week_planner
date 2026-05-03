import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { OnboardingData } from './onboarding.models';

@Component({
  selector: 'app-onboarding-step-hours',
  imports: [],
  template: `
    <section class="step-wrap">
      <h2 class="step-title">How many hours per week can you train?</h2>
      <p class="step-subtitle">Including running, cycling, swimming, strength, mobility — total time</p>

      <div class="hours-display">
        <button type="button" class="stepper-btn" (click)="adjust(-0.5)" [disabled]="(data().weeklyHours ?? 0) <= 3">-</button>
        <p class="hours-value">
          @if (data().weeklyHours) {
            {{ data().weeklyHours }}h
          } @else {
            –
          }
        </p>
        <button type="button" class="stepper-btn" (click)="adjust(0.5)" [disabled]="(data().weeklyHours ?? 0) >= 20">+</button>
      </div>

      <div class="preset-row">
        @for (h of presets; track h) {
          <button type="button" class="preset-chip" [class.selected]="data().weeklyHours === h" (click)="set(h)">{{ h }}h</button>
        }
      </div>

      <p class="info-text">Be honest — we'd rather plan sustainable volume than set you up to miss sessions</p>

      <button type="button" class="btn-primary step-cta" [disabled]="!data().weeklyHours" (click)="next.emit()">Next</button>
    </section>
  `,
  styles: `
    .step-wrap { display: flex; flex-direction: column; gap: 16px; }
    .hours-display { display: flex; align-items: center; justify-content: center; gap: 28px; margin: 8px 0; }
    .hours-value { font-size: 56px; font-weight: 700; color: var(--color-primary); min-width: 110px; text-align: center; line-height: 1; }
    .stepper-btn {
      width: 42px; height: 42px;
      border-radius: 50%;
      border: 1px solid var(--color-border);
      background: var(--color-card);
      color: var(--color-text);
      font-size: 22px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .stepper-btn:disabled { opacity: 0.35; cursor: not-allowed; }
    .preset-row { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
    .preset-chip {
      padding: 7px 16px;
      border: 1px solid var(--color-border);
      border-radius: 999px;
      background: var(--color-card);
      font-size: 13px;
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s;
    }
    .preset-chip.selected { border-color: var(--color-primary); background: rgba(45, 77, 122, 0.1); color: var(--color-primary); }
    .info-text { font-size: 12px; color: var(--color-text-secondary); text-align: center; }
    .step-cta { margin-top: 4px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingStepHoursComponent {
  readonly data = input.required<OnboardingData>();
  readonly dataChange = output<Partial<OnboardingData>>();
  readonly next = output<void>();

  protected readonly presets = [4, 5, 6, 8, 10, 12, 15];

  protected adjust(delta: number): void {
    const current = this.data().weeklyHours ?? 5;
    const next = Math.min(20, Math.max(3, +(current + delta).toFixed(1)));
    this.dataChange.emit({ weeklyHours: next });
  }

  protected set(h: number): void {
    this.dataChange.emit({ weeklyHours: h });
  }
}
