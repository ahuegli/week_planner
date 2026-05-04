import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { OnboardingData } from './onboarding.models';

@Component({
  selector: 'app-onboarding-step-triathlon',
  imports: [],
  template: `
    <section class="step-wrap">
      <h2 class="step-title">Tell us about your triathlon background</h2>
      <p class="step-subtitle">We'll set up your plan and adapt it as you share more</p>

      <div class="toggle-row">
        <span>I'm just training generally (no race date)</span>
        <button type="button" class="switch" [class.on]="data().isGeneralTriTraining"
          (click)="patch('isGeneralTriTraining', !data().isGeneralTriTraining)"><span></span></button>
      </div>

      <label class="field-label">Triathlons completed</label>
      <input class="input" type="number" min="0" max="99"
        [value]="data().triathlonsCompleted"
        (input)="patch('triathlonsCompleted', +$any($event.target).value)" />

      <label class="field-label">Endurance background</label>
      <select class="input" [value]="data().endurancePedigree"
        (change)="patch('endurancePedigree', $any($event.target).value)">
        <option value="none">None (triathlon is my first sport)</option>
        <option value="runner">Runner</option>
        <option value="cyclist">Cyclist</option>
        <option value="swimmer">Swimmer</option>
        <option value="multiple">Multiple sports</option>
      </select>

      <label class="field-label">Pool access</label>
      <select class="input" [value]="data().poolAccess"
        (change)="patch('poolAccess', $any($event.target).value)">
        <option value="25m">25m pool</option>
        <option value="50m">50m pool</option>
        <option value="pool_and_open_water">Pool and open water</option>
        <option value="open_water">Open water only</option>
        <option value="none">No pool access</option>
      </select>

      <div class="toggle-row">
        <span>I have a power meter</span>
        <button type="button" class="switch" [class.on]="data().hasPowerMeter"
          (click)="patch('hasPowerMeter', !data().hasPowerMeter)"><span></span></button>
      </div>

      <div class="toggle-row">
        <span>I know my FTP</span>
        <button type="button" class="switch" [class.on]="data().knowsFtp"
          (click)="patch('knowsFtp', !data().knowsFtp)"><span></span></button>
      </div>
      @if (data().knowsFtp) {
        <label class="field-label">FTP (watts)</label>
        <input class="input" type="number" min="50" max="500" placeholder="e.g. 240"
          [value]="data().ftpWatts ?? ''"
          (input)="patch('ftpWatts', +$any($event.target).value || null)" />
      }

      <div class="toggle-row">
        <span>I know my LTHR</span>
        <button type="button" class="switch" [class.on]="data().knowsLthr"
          (click)="patch('knowsLthr', !data().knowsLthr)"><span></span></button>
      </div>
      @if (data().knowsLthr) {
        <label class="field-label">Lactate threshold heart rate (bpm)</label>
        <input class="input" type="number" min="50" max="220" placeholder="e.g. 165"
          [value]="data().lthrBpm ?? ''"
          (input)="patch('lthrBpm', +$any($event.target).value || null)" />
      }

      <div class="toggle-row">
        <span>I know my CSS swim pace</span>
        <button type="button" class="switch" [class.on]="data().knowsCss"
          (click)="patch('knowsCss', !data().knowsCss)"><span></span></button>
      </div>
      @if (data().knowsCss) {
        <label class="field-label">CSS pace (seconds per 100m)</label>
        <input class="input" type="number" min="60" max="300" placeholder="e.g. 95"
          [value]="data().cssSecondsPer100m ?? ''"
          (input)="patch('cssSecondsPer100m', +$any($event.target).value || null)" />
      }

      <div class="toggle-row">
        <span>I know my run threshold pace</span>
        <button type="button" class="switch" [class.on]="data().knowsRunThreshold"
          (click)="patch('knowsRunThreshold', !data().knowsRunThreshold)"><span></span></button>
      </div>
      @if (data().knowsRunThreshold) {
        <label class="field-label">Run threshold pace (seconds per km)</label>
        <input class="input" type="number" min="180" max="600" placeholder="e.g. 300"
          [value]="data().runThresholdSecPerKm ?? ''"
          (input)="patch('runThresholdSecPerKm', +$any($event.target).value || null)" />
      }

      <p class="info-text">No zones yet? We'll use perceived effort (RPE) guidelines for now. You can add precise zones later in Settings.</p>

      <button type="button" class="btn-primary step-cta" (click)="next.emit()">Next</button>
    </section>
  `,
  styles: `
    .step-wrap { display: flex; flex-direction: column; gap: 12px; }
    .field-label { font-size: 13px; font-weight: 600; color: var(--color-text); margin-top: 4px; }
    .input {
      width: 100%;
      height: 40px;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 0 10px;
      background: var(--color-card);
      color: var(--color-text);
      font-size: 14px;
    }
    .toggle-row { display: flex; justify-content: space-between; align-items: center; min-height: 44px; }
    .toggle-row span { font-size: 14px; color: var(--color-text); }
    .switch {
      width: 44px; height: 24px;
      border-radius: 12px;
      background: var(--color-border);
      border: none; cursor: pointer; position: relative; transition: background 0.2s;
      flex-shrink: 0;
    }
    .switch.on { background: var(--color-primary); }
    .switch span {
      position: absolute; top: 2px; left: 2px;
      width: 20px; height: 20px;
      background: white; border-radius: 50%;
      transition: transform 0.2s;
    }
    .switch.on span { transform: translateX(20px); }
    .info-text { font-size: 12px; color: var(--color-text-secondary); }
    .step-cta { margin-top: 6px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingStepTriathlonComponent {
  readonly data = input.required<OnboardingData>();
  readonly dataChange = output<Partial<OnboardingData>>();
  readonly next = output<void>();

  protected patch<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]): void {
    this.dataChange.emit({ [key]: value });
  }
}
