import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { OnboardingData } from './onboarding.models';

@Component({
  selector: 'app-onboarding-step-summary',
  imports: [],
  template: `
    <section class="step-wrap">
      <h2 class="step-title">You're all set</h2>

      <article class="summary-card">
        <div class="summary-row"><span>Goal:</span><span>{{ goalSummary() }}</span><button type="button" class="edit-link" (click)="editStep.emit(2)">Edit</button></div>
        <div class="summary-row"><span>Activities:</span><span>{{ activitySummary() }}</span><button type="button" class="edit-link" (click)="editStep.emit(3)">Edit</button></div>
        <div class="summary-row"><span>Training days:</span><span>{{ data().trainingDays }} days/week</span><button type="button" class="edit-link" (click)="editStep.emit(stepFor(4))">Edit</button></div>
        <div class="summary-row"><span>Preferred times:</span><span>{{ data().preferredTimes.join(', ') }}</span><button type="button" class="edit-link" (click)="editStep.emit(stepFor(4))">Edit</button></div>
        <div class="summary-row"><span>Work:</span><span>{{ workSummary() }}</span><button type="button" class="edit-link" (click)="editStep.emit(stepFor(5))">Edit</button></div>
        <div class="summary-row"><span>Cycle tracking:</span><span>{{ cycleSummary() }}</span><button type="button" class="edit-link" (click)="editStep.emit(stepFor(6))">Edit</button></div>
      </article>

      <p class="settings-note">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
        You can adjust any of these preferences anytime in Settings
      </p>

      <button type="button" class="btn-primary step-cta" [disabled]="loading()" (click)="generate.emit()">
        @if (loading()) {
          <span class="loader"></span>
          <span>Building your plan...</span>
        } @else {
          <span>Generate My Plan</span>
        }
      </button>
    </section>
  `,
  styles: `
    .step-wrap { display: flex; flex-direction: column; gap: 14px; }
    .summary-card { border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-card); padding: 12px; display: flex; flex-direction: column; gap: 8px; }
    .summary-row { display: grid; grid-template-columns: 92px 1fr auto; gap: 8px; align-items: start; font-size: 13px; color: var(--color-text); }
    .summary-row span:first-child { color: var(--color-text-secondary); }
    .edit-link { border: none; background: transparent; color: var(--color-primary); padding: 0; font-size: 12px; cursor: pointer; }
    .settings-note { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 13px; color: var(--color-text-secondary); text-align: center; }
    .step-cta { display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
    .loader {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.45);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingStepSummaryComponent {
  readonly data = input.required<OnboardingData>();
  readonly loading = input(false);
  readonly editStep = output<number>();
  readonly generate = output<void>();

  protected readonly isTriathlonPlan = computed(() => this.data().triathlonDistance !== '');

  protected stepFor(base: number): number {
    return this.isTriathlonPlan() ? base + 1 : base;
  }

  protected goalSummary(): string {
    if (this.data().goal === 'race') {
      const label = this.data().raceEvent || 'Race';
      return this.data().raceDate ? `${label} - ${this.data().raceDate}` : label;
    }
    if (this.data().goal === 'weight_loss') {
      return 'Weight management';
    }
    if (this.data().goal === 'fitness') {
      return 'Stay fit & healthy';
    }
    return 'Not set';
  }

  protected activitySummary(): string {
    return this.data().activities.length > 0 ? this.data().activities.join(', ') : 'None selected';
  }

  protected workSummary(): string {
    if (this.data().shiftPattern === 'irregular') {
      return 'Irregular schedule';
    }
    const firstShift = this.data().shifts[0];
    if (!firstShift) {
      return 'Not set';
    }
    return `${this.data().shiftPattern} · ${firstShift.days.join(' ')} ${firstShift.startTime}-${firstShift.endTime}`;
  }

  protected cycleSummary(): string {
    if (!this.data().cycleEnabled) {
      return 'Skipped';
    }
    switch (this.data().cycleStatus) {
      case 'regular':
        return `Enabled - Regular cycles, ${this.data().cycleLength} days`;
      case 'irregular':
        return 'Enabled - Irregular cycles';
      case 'hormonal':
        return 'Enabled - Hormonal contraception';
      case 'menopause':
        return 'Enabled - Perimenopause / menopause';
      default:
        return 'Enabled';
    }
  }
}
