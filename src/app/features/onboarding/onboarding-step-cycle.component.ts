import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CycleStatus, OnboardingData } from './onboarding.models';

@Component({
  selector: 'app-onboarding-step-cycle',
  imports: [],
  template: `
    <section class="step-wrap">
      <h2 class="step-title">One more thing - would you like to optimize around your cycle?</h2>
      <p class="step-subtitle">Training and nutrition respond differently across your menstrual cycle. We can adapt your plan accordingly.</p>

      <div class="choice-list">
        <button type="button" class="choice-card" [class.selected]="data().cycleEnabled" (click)="chooseCycleEnabled()">
          <p class="choice-title">Yes, track my cycle</p>
          <p class="choice-subtitle">We'll adjust workout intensity, recovery, and nutrition targets based on your cycle phase</p>
        </button>
        <button type="button" class="choice-card" [class.selected]="!data().cycleEnabled" (click)="chooseSkipForNow()">
          <p class="choice-title">Skip for now</p>
          <p class="choice-subtitle">Decide later. You can turn this on anytime in Settings.</p>
        </button>
      </div>

      @if (data().cycleEnabled) {
        <p class="field-label">Where are you in your cycle?</p>
        <div class="radio-list">
          @for (option of statusOptions; track option.value) {
            <button type="button" class="radio-item" [class.selected]="data().cycleStatus === option.value" (click)="setStatus(option.value)">
              {{ option.label }}
            </button>
          }
        </div>

        @if (data().cycleStatus === 'regular' || data().cycleStatus === 'irregular') {
          <label class="field-label">Last period start date</label>
          <input class="input" type="date" [value]="data().lastPeriodDate" (input)="patch('lastPeriodDate', $any($event.target).value)" />

          @if (data().cycleStatus === 'regular') {
            <label class="field-label">Average cycle length (days)</label>
            <div class="stepper-inline">
              <button type="button" class="stepper-btn" (click)="adjustLength(-1)">-</button>
              <p class="stepper-value">{{ data().cycleLength }}</p>
              <button type="button" class="stepper-btn" (click)="adjustLength(1)">+</button>
            </div>
          } @else {
            <p class="info-text">Don't worry - we'll adjust as we learn your pattern.</p>
          }
        }

        @if (data().cycleStatus === 'hormonal') {
          <p class="info-text">We'll use a simplified model focused on energy levels.</p>
        }

        @if (data().cycleStatus === 'menopause') {
          <p class="info-text">We'll focus on recovery, bone health, and higher protein targets.</p>
        }
      }

      <div class="footer-row">
        <button type="button" class="text-link" (click)="skip.emit()">Skip</button>
        <button type="button" class="btn-primary step-cta" (click)="next.emit()">Next</button>
      </div>
    </section>
  `,
  styles: `
    .step-wrap { display: flex; flex-direction: column; gap: 12px; }
    .choice-list { display: flex; flex-direction: column; gap: 8px; }
    .choice-card {
      border: 1px solid var(--color-border);
      border-radius: 12px;
      background: var(--color-card);
      text-align: left;
      padding: 12px;
      cursor: pointer;
    }
    .choice-card.selected { border-color: var(--color-primary); box-shadow: inset 0 0 0 1px var(--color-primary); }
    .choice-title { font-size: 14px; font-weight: 600; }
    .choice-subtitle { margin-top: 3px; font-size: 12px; color: var(--color-text-secondary); }
    .field-label { font-size: 13px; font-weight: 600; color: var(--color-text); }
    .radio-list { display: flex; flex-direction: column; gap: 6px; }
    .radio-item { min-height: 44px; border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-card); text-align: left; padding: 0 10px; cursor: pointer; }
    .radio-item.selected { border-color: var(--color-primary); color: var(--color-primary); }
    .input { width: 100%; height: 40px; border: 1px solid var(--color-border); border-radius: 8px; padding: 0 10px; }
    .stepper-inline { display: flex; align-items: center; gap: 14px; }
    .stepper-btn { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--color-border); background: var(--color-card); font-size: 20px; cursor: pointer; }
    .stepper-value { min-width: 44px; text-align: center; font-size: 16px; font-weight: 600; }
    .info-text { font-size: 12px; color: var(--color-text-secondary); font-style: italic; }
    .footer-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 8px; }
    .text-link { border: none; background: transparent; color: var(--color-primary); font-size: 13px; cursor: pointer; padding: 0; }
    .step-cta { width: auto; min-width: 120px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingStepCycleComponent {
  readonly data = input.required<OnboardingData>();
  readonly dataChange = output<Partial<OnboardingData>>();
  readonly next = output<void>();
  readonly skip = output<void>();

  protected readonly statusOptions: Array<{ value: CycleStatus; label: string }> = [
    { value: 'regular', label: 'I have regular cycles' },
    { value: 'irregular', label: 'My cycles are irregular' },
    { value: 'hormonal', label: "I'm on hormonal contraception" },
    { value: 'menopause', label: "I'm in perimenopause or menopause" },
  ];

  protected chooseCycleEnabled(): void {
    this.emitCycleChoice({ cycleEnabled: true, cycleSkipped: false });
  }

  protected chooseSkipForNow(): void {
    this.emitCycleChoice({ cycleEnabled: false, cycleSkipped: true });
  }

  protected setStatus(status: CycleStatus): void {
    this.dataChange.emit({ cycleStatus: status });
  }

  protected patch<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]): void {
    this.dataChange.emit({ [key]: value });
  }

  protected adjustLength(delta: number): void {
    const cycleLength = Math.min(40, Math.max(21, this.data().cycleLength + delta));
    this.dataChange.emit({ cycleLength });
  }

  private emitCycleChoice(choice: { cycleEnabled: boolean; cycleSkipped: boolean }): void {
    this.dataChange.emit(choice as Partial<OnboardingData>);
  }
}
