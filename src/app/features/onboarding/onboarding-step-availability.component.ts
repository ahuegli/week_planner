import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { OnboardingData } from './onboarding.models';

@Component({
  selector: 'app-onboarding-step-availability',
  imports: [],
  template: `
    <section class="step-wrap">
      <h2 class="step-title">How many days can you train?</h2>
      <p class="step-subtitle">Be realistic - we'd rather plan fewer quality sessions</p>

      <div class="stepper-large">
        <button type="button" class="stepper-btn" (click)="adjustDays(-1)">-</button>
        <p class="days-value">{{ data().trainingDays }}</p>
        <button type="button" class="stepper-btn" (click)="adjustDays(1)">+</button>
      </div>

      <p class="field-label">Preferred times</p>
      <div class="chip-grid">
        @for (time of times; track time) {
          <button type="button" class="chip" [class.selected]="data().preferredTimes.includes(time)" (click)="toggleTime(time)">{{ time }}</button>
        }
      </div>

      @if (hasEnduranceSports()) {
        <div class="threshold-section">
          <p class="threshold-title">Intensive session thresholds</p>
          <p class="threshold-helper">Sessions exceeding these limits are treated as intensive — the algorithm will schedule a rest day afterwards. You can adjust these anytime in Settings.</p>

          @for (sport of enduranceSports(); track sport.key) {
            <div class="threshold-sport">
              <p class="sport-label">{{ sport.name }}</p>
              <div class="threshold-row">
                <span class="threshold-label">Duration</span>
                <div class="mini-stepper">
                  <button type="button" class="stepper-btn" (click)="adjustThreshold(sport.minutesKey, -5, 15, 300)">-</button>
                  <span>{{ data()[sport.minutesKey] }} min</span>
                  <button type="button" class="stepper-btn" (click)="adjustThreshold(sport.minutesKey, 5, 15, 300)">+</button>
                </div>
              </div>
              <div class="threshold-row">
                <span class="threshold-label">Distance</span>
                <div class="mini-stepper">
                  <button type="button" class="stepper-btn" (click)="adjustThreshold(sport.distanceKey, -1, 1, 200)">-</button>
                  <span>{{ data()[sport.distanceKey] }} km</span>
                  <button type="button" class="stepper-btn" (click)="adjustThreshold(sport.distanceKey, 1, 1, 200)">+</button>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <button type="button" class="btn-primary step-cta" (click)="next.emit()">Next</button>
    </section>
  `,
  styles: `
    .step-wrap { display: flex; flex-direction: column; gap: 14px; }
    .stepper-large { display: flex; align-items: center; justify-content: center; gap: 22px; }
    .days-value { font-size: 48px; font-weight: 700; color: var(--color-primary); min-width: 60px; text-align: center; }
    .stepper-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 1px solid var(--color-border);
      background: var(--color-card);
      color: var(--color-text);
      font-size: 20px;
      cursor: pointer;
    }
    .field-label { font-size: 13px; font-weight: 600; color: var(--color-text); }
    .chip-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .chip {
      min-height: 42px;
      border: 1px solid var(--color-border);
      border-radius: 999px;
      padding: 8px 10px;
      background: var(--color-card);
      font-size: 13px;
      cursor: pointer;
    }
    .chip.selected { border-color: var(--color-primary); background: rgba(45, 77, 122, 0.1); color: var(--color-primary); }
    .step-cta { margin-top: 8px; }
    .threshold-section { display: flex; flex-direction: column; gap: 10px; border-top: 1px solid var(--color-border); padding-top: 12px; }
    .threshold-title { font-size: 14px; font-weight: 600; color: var(--color-text); margin: 0; }
    .threshold-helper { font-size: 12px; color: var(--color-text-secondary); font-style: italic; margin: 0; }
    .threshold-sport { display: flex; flex-direction: column; gap: 6px; }
    .sport-label { font-size: 13px; font-weight: 600; color: var(--color-text); margin: 0; }
    .threshold-row { display: flex; align-items: center; justify-content: space-between; }
    .threshold-label { font-size: 13px; color: var(--color-text-secondary); }
    .mini-stepper { display: flex; align-items: center; gap: 12px; font-size: 13px; color: var(--color-text); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingStepAvailabilityComponent {
  readonly data = input.required<OnboardingData>();
  readonly dataChange = output<Partial<OnboardingData>>();
  readonly next = output<void>();

  protected readonly times = [
    'Early morning',
    'Morning',
    'Afternoon',
    'Evening',
    'Late evening',
    'Flexible',
  ];

  private readonly enduranceSportDefs = [
    { key: 'Running', name: 'Running', minutesKey: 'runningThresholdMinutes' as keyof OnboardingData, distanceKey: 'runningThresholdDistance' as keyof OnboardingData },
    { key: 'Cycling', name: 'Cycling', minutesKey: 'cyclingThresholdMinutes' as keyof OnboardingData, distanceKey: 'cyclingThresholdDistance' as keyof OnboardingData },
    { key: 'Swimming', name: 'Swimming', minutesKey: 'swimmingThresholdMinutes' as keyof OnboardingData, distanceKey: 'swimmingThresholdDistance' as keyof OnboardingData },
  ];

  protected readonly enduranceSports = computed(() =>
    this.enduranceSportDefs.filter((s) => this.data().activities.includes(s.key)),
  );

  protected readonly hasEnduranceSports = computed(() => this.enduranceSports().length > 0);

  protected adjustDays(delta: number): void {
    const value = Math.min(7, Math.max(2, this.data().trainingDays + delta));
    this.dataChange.emit({ trainingDays: value });
  }

  protected toggleTime(label: string): void {
    const current = this.data().preferredTimes;
    const preferredTimes = current.includes(label) ? current.filter((item) => item !== label) : [...current, label];
    this.dataChange.emit({ preferredTimes: preferredTimes.length > 0 ? preferredTimes : ['Flexible'] });
  }

  protected adjustThreshold(key: keyof OnboardingData, delta: number, min: number, max: number): void {
    const current = this.data()[key] as number;
    this.dataChange.emit({ [key]: Math.max(min, Math.min(max, current + delta)) });
  }
}
