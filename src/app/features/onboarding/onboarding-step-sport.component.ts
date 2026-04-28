import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { GoalMode, OnboardingData } from './onboarding.models';

const TRIATHLON_DISTANCE_MAP: Record<string, OnboardingData['triathlonDistance']> = {
  'Triathlon (Sprint)': 'sprint',
  'Triathlon (Olympic)': 'olympic',
  'Triathlon (Half / 70.3)': '70_3',
  'Triathlon (Full / 140.6)': '140_6',
};

@Component({
  selector: 'app-onboarding-step-sport',
  imports: [],
  template: `
    <section class="step-wrap">
      @if (goal() === 'race') {
        <h2 class="step-title">What's your event?</h2>
        <p class="step-subtitle">We'll build a plan specific to your race</p>

        <div class="chip-grid">
          @for (event of raceEvents; track event) {
            <button type="button" class="chip" [class.selected]="data().raceEvent === event" (click)="setRaceEvent(event)">{{ event }}</button>
          }
        </div>

        @if (data().raceEvent === 'Other') {
          <label class="field-label">Other event</label>
          <input class="input" type="text" [value]="data().raceOther" (input)="patch('raceOther', $any($event.target).value)" />
        }

        @if (data().raceEvent) {
          <label class="field-label">Race date</label>
          <input class="input" type="date" [value]="data().raceDate" (input)="patch('raceDate', $any($event.target).value)" />

          <label class="field-label">Target time (optional)</label>
          <input class="input" type="time" step="1" [value]="data().targetTime" (input)="patch('targetTime', $any($event.target).value)" />

          <label class="field-label">Current fitness</label>
          <select class="input" [value]="data().currentFitness" (change)="patch('currentFitness', $any($event.target).value)">
            <option>Just starting</option>
            <option>Recreational (run 2-3x/week)</option>
            <option>Intermediate (run 4-5x/week)</option>
            <option>Advanced (structured training)</option>
          </select>
        }
      } @else {
        <h2 class="step-title">What activities do you enjoy?</h2>
        <p class="step-subtitle">Select all that apply - we'll build your week around these</p>

        <div class="chip-grid">
          @for (activity of activities; track activity) {
            <button type="button" class="chip" [class.selected]="data().activities.includes(activity)" (click)="toggleActivity(activity)">
              {{ activity }}
            </button>
          }
        </div>

        @if (goal() === 'weight_loss') {
          <label class="field-label">Current weight (kg)</label>
          <input class="input" type="number" min="30" max="300" [value]="data().currentWeight" (input)="patch('currentWeight', $any($event.target).value)" />

          <label class="field-label">Target weight (optional)</label>
          <input class="input" type="number" min="30" max="250" [value]="data().targetWeight" (input)="patch('targetWeight', $any($event.target).value)" />
          <p class="info-text-italic">We'll calculate a sustainable weekly deficit based on the difference</p>

          <label class="field-label">Timeline</label>
          <select class="input" [value]="data().timeline" (change)="patch('timeline', $any($event.target).value)">
            <option>No rush - sustainable pace</option>
            <option>3 months</option>
            <option>6 months</option>
          </select>
          <p class="info-text">We'll coordinate with FridgeMate for nutrition targets if connected</p>
        }
      }

      <button type="button" class="btn-primary step-cta" [disabled]="!canContinue()" (click)="next.emit()">Next</button>
    </section>
  `,
  styles: `
    .step-wrap { display: flex; flex-direction: column; gap: 12px; }
    .chip-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .chip {
      min-height: 44px;
      border: 1px solid var(--color-border);
      border-radius: 10px;
      background: var(--color-card);
      color: var(--color-text);
      font-size: 13px;
      padding: 8px;
      text-align: center;
      cursor: pointer;
    }
    .chip.selected { border-color: var(--color-primary); color: var(--color-primary); background: rgba(45, 77, 122, 0.08); }
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
    .info-text { font-size: 12px; color: var(--color-text-secondary); }
    .info-text-italic { font-size: 12px; color: var(--color-text-secondary); font-style: italic; }
    .step-cta { margin-top: 6px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingStepSportComponent {
  readonly goal = input.required<GoalMode>();
  readonly data = input.required<OnboardingData>();
  readonly dataChange = output<Partial<OnboardingData>>();
  readonly next = output<void>();

  protected readonly raceEvents = [
    'Marathon',
    'Half Marathon',
    '10K',
    '5K',
    'Triathlon (Sprint)',
    'Triathlon (Olympic)',
    'Triathlon (Half / 70.3)',
    'Triathlon (Full / 140.6)',
    'Cycling event',
    'Swimming event',
    'Other',
  ];

  protected readonly activities = [
    'Running',
    'Cycling',
    'Swimming',
    'Strength Training',
    'Yoga / Pilates',
    'Bouldering',
    'Boxing / Martial Arts',
    'Dance',
    'Hiking',
    'Other',
  ];

  protected setRaceEvent(value: string): void {
    const dist = TRIATHLON_DISTANCE_MAP[value] ?? '';
    this.dataChange.emit({ raceEvent: value, triathlonDistance: dist });
  }

  protected toggleActivity(value: string): void {
    const current = this.data().activities;
    const activities = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    this.dataChange.emit({ activities });
  }

  protected patch<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]): void {
    this.dataChange.emit({ [key]: value });
  }

  protected canContinue(): boolean {
    if (this.goal() === 'race') {
      return Boolean(this.data().raceEvent);
    }
    return this.data().activities.length > 0;
  }
}
