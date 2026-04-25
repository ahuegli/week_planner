import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { OnboardingData, ShiftPattern, ShiftTemplate } from './onboarding.models';

@Component({
  selector: 'app-onboarding-step-work',
  imports: [],
  template: `
    <section class="step-wrap">
      <h2 class="step-title">What's your work schedule?</h2>
      <p class="step-subtitle">We'll plan workouts around your shifts and commitments</p>

      <div class="pattern-list">
        <button type="button" class="pattern-card" [class.selected]="data().shiftPattern === 'fixed'" (click)="setPattern('fixed')">
          <p class="pattern-title">Fixed schedule</p>
          <p class="pattern-subtitle">Same days every week</p>
        </button>
        <button type="button" class="pattern-card" [class.selected]="data().shiftPattern === 'rotating'" (click)="setPattern('rotating')">
          <p class="pattern-title">Rotating shifts</p>
          <p class="pattern-subtitle">Changes on a regular cycle</p>
        </button>
        <button type="button" class="pattern-card" [class.selected]="data().shiftPattern === 'irregular'" (click)="setPattern('irregular')">
          <p class="pattern-title">Irregular</p>
          <p class="pattern-subtitle">Different every week</p>
        </button>
      </div>

      @if (data().shiftPattern === 'fixed' || data().shiftPattern === 'rotating') {
        @for (shift of data().shifts; track shift.id) {
          <div class="shift-card">
            <label class="field-label">Shift name</label>
            <input class="input" type="text" [value]="shift.name" (input)="patchShift(shift.id, 'name', $any($event.target).value)" />

            <div class="two-col">
              <div>
                <label class="field-label">Start time</label>
                <input class="input" type="time" [value]="shift.startTime" (input)="patchShift(shift.id, 'startTime', $any($event.target).value)" />
              </div>
              <div>
                <label class="field-label">End time</label>
                <input class="input" type="time" [value]="shift.endTime" (input)="patchShift(shift.id, 'endTime', $any($event.target).value)" />
              </div>
            </div>

            <p class="field-label">Days</p>
            <div class="days-row">
              @for (day of weekDays; track day) {
                <button type="button" class="day-chip" [class.selected]="shift.days.includes(day)" (click)="toggleShiftDay(shift.id, day)">{{ day }}</button>
              }
            </div>
          </div>
        }

        @if (data().shifts.length < 2) {
          <button type="button" class="text-link" (click)="addShift()">Add another shift</button>
        }
      } @else {
        <p class="info-text">No problem - you can add your shifts week by week in the app.</p>
      }

      <label class="field-label">Commute (minutes)</label>
      <div class="stepper-inline">
        <button type="button" class="stepper-btn" (click)="adjustCommute(-5)">-</button>
        <p class="stepper-value">{{ data().commuteMinutes }}</p>
        <button type="button" class="stepper-btn" (click)="adjustCommute(5)">+</button>
      </div>

      <div class="two-col">
        <div>
          <label class="field-label">Bedtime</label>
          <input class="input" type="time" [value]="data().bedtime" (input)="patch('bedtime', $any($event.target).value)" />
        </div>
        <div>
          <label class="field-label">Wake time</label>
          <input class="input" type="time" [value]="data().wakeTime" (input)="patch('wakeTime', $any($event.target).value)" />
        </div>
      </div>

      <button type="button" class="btn-primary step-cta" (click)="next.emit()">Next</button>
    </section>
  `,
  styles: `
    .step-wrap { display: flex; flex-direction: column; gap: 12px; }
    .pattern-list { display: flex; flex-direction: column; gap: 8px; }
    .pattern-card {
      min-height: 64px;
      border: 1px solid var(--color-border);
      border-radius: 12px;
      background: var(--color-card);
      text-align: left;
      padding: 10px 12px;
      cursor: pointer;
    }
    .pattern-card.selected { border-color: var(--color-primary); box-shadow: inset 0 0 0 1px var(--color-primary); }
    .pattern-title { font-size: 14px; font-weight: 600; color: var(--color-text); }
    .pattern-subtitle { margin-top: 2px; font-size: 12px; color: var(--color-text-secondary); }
    .shift-card { border: 1px solid var(--color-border); border-radius: 10px; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
    .field-label { font-size: 13px; font-weight: 600; color: var(--color-text); }
    .input { width: 100%; height: 40px; border: 1px solid var(--color-border); border-radius: 8px; padding: 0 10px; font-size: 14px; }
    .two-col { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .days-row { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; }
    .day-chip { height: 34px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-card); font-size: 12px; cursor: pointer; }
    .day-chip.selected { border-color: var(--color-primary); color: var(--color-primary); background: rgba(45, 77, 122, 0.08); }
    .text-link { border: none; background: transparent; color: var(--color-primary); font-size: 13px; padding: 0; text-align: left; cursor: pointer; width: fit-content; }
    .info-text { font-size: 12px; color: var(--color-text-secondary); }
    .stepper-inline { display: flex; align-items: center; gap: 14px; }
    .stepper-btn { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--color-border); background: var(--color-card); font-size: 20px; cursor: pointer; }
    .stepper-value { min-width: 44px; text-align: center; font-size: 16px; font-weight: 600; }
    .step-cta { margin-top: 8px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingStepWorkComponent {
  readonly data = input.required<OnboardingData>();
  readonly dataChange = output<Partial<OnboardingData>>();
  readonly next = output<void>();

  protected readonly weekDays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  protected setPattern(pattern: ShiftPattern): void {
    this.dataChange.emit({ shiftPattern: pattern });
  }

  protected patch<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]): void {
    this.dataChange.emit({ [key]: value });
  }

  protected adjustCommute(delta: number): void {
    const commuteMinutes = Math.min(120, Math.max(0, this.data().commuteMinutes + delta));
    this.dataChange.emit({ commuteMinutes });
  }

  protected patchShift(id: string, key: keyof ShiftTemplate, value: string): void {
    const shifts = this.data().shifts.map((shift) => (shift.id === id ? { ...shift, [key]: value } : shift));
    this.dataChange.emit({ shifts });
  }

  protected toggleShiftDay(id: string, day: string): void {
    const shifts = this.data().shifts.map((shift) => {
      if (shift.id !== id) {
        return shift;
      }
      const days = shift.days.includes(day) ? shift.days.filter((item) => item !== day) : [...shift.days, day];
      return { ...shift, days };
    });
    this.dataChange.emit({ shifts });
  }

  protected addShift(): void {
    const nextShift: ShiftTemplate = {
      id: `shift-${this.data().shifts.length + 1}`,
      name: 'Second Shift',
      startTime: '14:00',
      endTime: '22:00',
      days: ['Sa', 'Su'],
    };
    this.dataChange.emit({ shifts: [...this.data().shifts, nextShift] });
  }
}
