import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataStoreService } from '../core/services/data-store.service';
import { cycleTrackingEnabled } from '../shared/state/cycle-ui.state';

type EnergyLevel = 'low' | 'normal' | 'high' | null;
type PhaseKey = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

interface PhaseSegment {
  key: PhaseKey;
  label: string;
  color: string;
  startDay: number;
  endDay: number;
}

@Component({
  selector: 'app-cycle-page',
  imports: [RouterLink],
  template: `
    <section class="page-wrap">
      <header class="page-header">
        <h1 class="page-title">My Cycle</h1>
        <a routerLink="/settings" class="header-settings" aria-label="Open settings">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </a>
      </header>

      @if (!cycleTrackingEnabled()) {
        <article class="section-card card">
          <h2 class="section-title">Cycle tracking is off</h2>
          <p class="section-sub">Set up cycle tracking in Settings to get started.</p>
          <a routerLink="/settings" class="btn-secondary setup-link">Go to Settings</a>
        </article>
      } @else if (!cycleProfile()) {
        <article class="section-card card">
          <h2 class="section-title">Cycle profile unavailable</h2>
          <p class="section-sub">Set up cycle tracking in Settings to get started.</p>
          <a routerLink="/settings" class="btn-secondary setup-link">Go to Settings</a>
        </article>
      } @else {
        @if (showsPhaseBanner()) {
          <div class="mode-banner" role="note">
            <svg class="banner-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p class="banner-text">{{ bannerMessage() }}</p>
          </div>
        }
        @if (showsPhaseRing()) {
          <article class="phase-card card">
            <div class="phase-ring-wrap" aria-label="Cycle phase ring">
              <svg viewBox="0 0 180 180" width="180" height="180" class="phase-ring-svg" role="img" aria-label="Cycle phases">
                <circle cx="90" cy="90" r="68" class="phase-track" />

                @for (segment of phaseSegments(); track segment.key) {
                  <path
                    [attr.d]="arcPathForDays(segment.startDay, segment.endDay)"
                    [attr.stroke]="segment.color"
                    class="phase-arc"
                    [attr.aria-label]="segment.label"
                  />
                }

                @if (isIrregular()) {
                  <path [attr.d]="uncertaintyArcPath()" class="uncertainty-arc" />
                }

                <circle [attr.cx]="markerX()" [attr.cy]="markerY()" r="5" class="phase-marker-dot" />
              </svg>

              <div class="phase-center">
                <p class="phase-day">Day {{ currentDay() }}</p>
                <p class="phase-name-text">{{ currentPhaseLabel() }}</p>
              </div>
            </div>

            <div class="phase-legend">
              @for (segment of phaseSegments(); track segment.key) {
                <span class="phase-legend-item"><span class="pl-dot" [style.background]="segment.color"></span>{{ segment.label }}</span>
              }
            </div>
          </article>
        } @else if (!showsPhaseBanner()) {
          <article class="section-card card">
            <h2 class="section-title">You're almost ready</h2>
            <p class="section-sub">Log your period start date to begin tracking.</p>
            <button type="button" class="btn-secondary period-btn" (click)="periodStartedToday()">Log period start as today</button>
            <a routerLink="/settings" class="text-link">Or set a specific date in Settings</a>
          </article>
        }
      }

      <article class="section-card card">
        <h2 class="section-title">How are you feeling today?</h2>
        <div class="energy-row">
          <button type="button" class="energy-card" [class.selected]="energyLevel() === 'low'" (click)="setEnergy('low')">
            <span>Low energy</span>
          </button>
          <button type="button" class="energy-card" [class.selected]="energyLevel() === 'normal'" (click)="setEnergy('normal')">
            <span>Normal</span>
          </button>
          <button type="button" class="energy-card" [class.selected]="energyLevel() === 'high'" (click)="setEnergy('high')">
            <span>High energy</span>
          </button>
        </div>

        <p class="sub-label">Any symptoms?</p>
        <div class="chip-wrap">
          @for (symptom of symptoms(); track symptom) {
            <button type="button" class="chip" [class.selected]="selectedSymptoms().includes(symptom)" (click)="toggleSymptom(symptom)">{{ symptom }}</button>
          }
        </div>

        @if (selectedSymptoms().includes('Other')) {
          <input
            class="other-input"
            type="text"
            placeholder="e.g., back pain, insomnia..."
            [value]="otherSymptom()"
            (input)="otherSymptom.set($any($event.target).value)"
          />
        }

        <button type="button" class="btn-secondary save-btn" (click)="saveCheckin()">Save</button>
      </article>

      @if (cycleTrackingEnabled()) {
        <article class="section-card card">
          <h2 class="section-title">Period update</h2>
          <p class="section-sub">Did your period start?</p>
          <div class="period-row">
            <button type="button" class="btn-secondary period-btn" (click)="periodStartedToday()">Yes, today</button>
            <button type="button" class="btn-secondary period-btn" (click)="periodNotYet()">Not yet</button>
          </div>
          <a routerLink="/settings" class="text-link">My period started on a different day</a>
        </article>
      }

      <div class="bottom-spacer"></div>
    </section>
  `,
  styles: `
    .page-wrap { display: flex; flex-direction: column; gap: 14px; padding: 16px; max-width: 480px; margin: 0 auto; }
    .page-header { padding: 4px 0 0; display: flex; align-items: flex-start; justify-content: space-between; }
    .page-title { font-family: Georgia, serif; font-size: 24px; margin: 0; color: var(--color-text); }
    .header-settings { color: var(--color-text-secondary); display: flex; align-items: center; padding: 4px; margin-top: 4px; border-radius: 6px; text-decoration: none; }
    .header-settings:hover { color: var(--color-text); }
    .card { background: var(--color-card); border: 1px solid var(--color-border); border-radius: 14px; padding: 14px; }
    .setup-link { text-decoration: none; display: inline-flex; width: fit-content; margin-top: 8px; }
    .phase-card { display: flex; flex-direction: column; gap: 8px; }
    .phase-ring-wrap { width: 180px; height: 180px; margin: 2px auto; position: relative; display: grid; place-items: center; }
    .phase-ring-svg { display: block; }
    .phase-track { fill: none; stroke: rgba(229, 225, 218, 0.8); stroke-width: 16; }
    .phase-arc { fill: none; stroke-width: 16; stroke-linecap: butt; }
    .uncertainty-arc { fill: none; stroke: rgba(196, 146, 58, 0.55); stroke-width: 18; stroke-linecap: round; stroke-dasharray: 4 6; }
    .phase-marker-dot { fill: var(--color-card); stroke: var(--color-text); stroke-width: 2; }
    .phase-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; }
    .phase-day { font-size: 20px; font-weight: 700; color: var(--color-text); margin: 0; line-height: 1.1; }
    .phase-name-text { font-size: 14px; color: var(--color-text-secondary); margin: 2px 0 0; text-transform: capitalize; }
    .phase-legend { display: flex; gap: 10px; flex-wrap: wrap; }
    .phase-legend-item { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--color-text-secondary); }
    .pl-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .section-card { display: flex; flex-direction: column; gap: 10px; }
    .section-title { font-size: 15px; font-weight: 600; color: var(--color-text); margin: 0; }
    .section-sub { font-size: 14px; color: var(--color-text); margin: 0; }
    .sub-label { font-size: 13px; font-weight: 600; color: var(--color-text); margin: 0; }
    .energy-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .energy-card { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px 6px; border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-card); font-size: 12px; color: var(--color-text); cursor: pointer; }
    .energy-card.selected { border-color: var(--color-primary); color: var(--color-primary); background: rgba(45, 77, 122, 0.08); }
    .chip-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
    .chip { padding: 6px 12px; border-radius: 999px; border: 1px solid var(--color-border); background: var(--color-card); font-size: 13px; color: var(--color-text); cursor: pointer; }
    .chip.selected { border-color: var(--color-primary); background: rgba(45, 77, 122, 0.1); color: var(--color-primary); }
    .other-input { width: 100%; height: 40px; border: 1px solid var(--color-border); border-radius: 8px; padding: 0 10px; background: var(--color-card); color: var(--color-text); font-size: 14px; }
    .save-btn { width: auto; align-self: flex-end; padding: 10px 20px; }
    .period-row { display: flex; gap: 10px; }
    .period-btn { flex: 1; }
    .text-link { background: transparent; border: none; color: var(--color-text-secondary); font-size: 13px; text-decoration: underline; text-decoration-color: rgba(0,0,0,0.2); cursor: pointer; text-align: left; padding: 0; }
    .mode-banner { display: flex; align-items: flex-start; gap: 10px; background: var(--color-bg-secondary, #F0EDE8); border-left: 4px solid var(--color-primary, #2d4d7a); border-radius: 8px; padding: 12px; }
    .banner-icon { flex-shrink: 0; color: var(--color-primary, #2d4d7a); margin-top: 1px; }
    .banner-text { font-size: 14px; color: var(--color-text); margin: 0; line-height: 1.5; }
    .bottom-spacer { height: 80px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CyclePageComponent {
  private readonly dataStore = inject(DataStoreService);

  protected readonly energyLevel = signal<EnergyLevel>(null);
  protected readonly selectedSymptoms = signal<string[]>([]);
  protected readonly otherSymptom = signal('');

  protected readonly cycleTrackingEnabled = cycleTrackingEnabled;
  protected readonly cycleProfile = computed(() => this.dataStore.cycleProfile());
  protected readonly currentPhase = computed(() => this.dataStore.currentPhase());

  protected readonly showsPhaseRing = computed(() => {
    const profile = this.cycleProfile();
    if (!profile) return false;
    if (!this.cycleTrackingEnabled()) return false;
    return profile.mode === 'natural' && !!profile.lastPeriodStart;
  });

  protected readonly showsPhaseBanner = computed(() => {
    const profile = this.cycleProfile();
    if (!profile) return false;
    if (!this.cycleTrackingEnabled()) return false;
    return profile.mode === 'hormonal_contraception' || profile.mode === 'perimenopause';
  });

  protected readonly bannerMessage = computed(() => {
    const profile = this.cycleProfile();
    if (!profile) return '';
    if (profile.mode === 'hormonal_contraception') {
      return "You're on hormonal contraception, so phase-based predictions don't apply. We'll use your energy and symptom logs to adapt your training.";
    }
    if (profile.mode === 'perimenopause') {
      return "Your cycle is likely irregular — we're using your logged energy and symptoms instead of phase predictions to adapt your training.";
    }
    return '';
  });

  protected readonly cycleLength = computed(() => this.currentPhase()?.cycleLengthDays ?? 28);
  protected readonly currentDay = computed(() => this.currentPhase()?.day ?? 1);

  protected readonly phaseSegments = computed<PhaseSegment[]>(() => {
    const boundaries = this.calculatePhaseBoundaries(this.cycleLength());
    return [
      { key: 'menstrual', label: 'Menstrual', color: '#A85454', startDay: boundaries.menstrual.start, endDay: boundaries.menstrual.end },
      { key: 'follicular', label: 'Follicular', color: '#2d4d7a', startDay: boundaries.follicular.start, endDay: boundaries.follicular.end },
      { key: 'ovulation', label: 'Ovulation', color: '#C4923A', startDay: boundaries.ovulation.start, endDay: boundaries.ovulation.end },
      { key: 'luteal', label: 'Luteal', color: '#6B7F5E', startDay: boundaries.luteal.start, endDay: boundaries.luteal.end },
    ];
  });

  protected readonly symptoms = computed(() => [
    'Cramps',
    'Headache',
    'Fatigue',
    'Bloating',
    'Mood changes',
    'None',
    'Other',
  ]);

  constructor() {
    void this.loadCycleData();
  }

  protected isIrregular(): boolean {
    return this.cycleProfile()?.variability === 'high';
  }

  protected currentPhaseLabel(): string {
    const phase = this.currentPhase()?.phase;
    if (!phase) {
      return 'Unknown';
    }

    return phase.charAt(0).toUpperCase() + phase.slice(1);
  }

  protected setEnergy(level: EnergyLevel): void {
    this.energyLevel.set(level);
  }

  protected toggleSymptom(symptom: string): void {
    const current = this.selectedSymptoms();
    if (symptom === 'None') {
      this.selectedSymptoms.set(current.includes('None') ? [] : ['None']);
      this.otherSymptom.set('');
      return;
    }

    const filtered = current.filter((s) => s !== 'None');
    const next = filtered.includes(symptom) ? filtered.filter((s) => s !== symptom) : [...filtered, symptom];
    this.selectedSymptoms.set(next);

    if (!next.includes('Other')) {
      this.otherSymptom.set('');
    }
  }

  protected async saveCheckin(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const energyLevel = this.energyLevel();
    const symptoms = this.selectedSymptoms();
    const otherSymptom = this.otherSymptom().trim();

    if (energyLevel) {
      await this.dataStore.saveEnergyCheckIn({
        date: today,
        level: energyLevel,
        source: 'daily_checkin',
      });
    }

    if (symptoms.length > 0 || otherSymptom) {
      await this.dataStore.saveSymptomLog({
        date: today,
        symptoms,
        otherSymptom: otherSymptom || null,
      });
    }
  }

  protected async periodStartedToday(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    await this.dataStore.logPeriodStart(today);
  }

  protected periodNotYet(): void {
    console.log('Period not yet');
  }

  protected arcPathForDays(startDay: number, endDay: number): string {
    const start = this.dayToAngle(startDay);
    const end = this.dayToAngle(endDay + 1);
    return this.describeArc(90, 90, 68, start, end);
  }

  protected uncertaintyArcPath(): string {
    const ovulation = this.phaseSegments().find((phase) => phase.key === 'ovulation');
    if (!ovulation) {
      return '';
    }

    const startDay = Math.max(1, ovulation.startDay - 3);
    const endDay = Math.min(this.cycleLength(), ovulation.endDay + 3);
    const start = this.dayToAngle(startDay);
    const end = this.dayToAngle(endDay + 1);
    return this.describeArc(90, 90, 68, start, end);
  }

  protected markerX(): number {
    const angle = this.dayToAngle(this.currentDay() + 0.5);
    return 90 + 68 * Math.cos((angle * Math.PI) / 180);
  }

  protected markerY(): number {
    const angle = this.dayToAngle(this.currentDay() + 0.5);
    return 90 + 68 * Math.sin((angle * Math.PI) / 180);
  }

  private async loadCycleData(): Promise<void> {
    await this.dataStore.loadAll();

    if (this.cycleTrackingEnabled() && !this.dataStore.currentPhase()) {
      await this.dataStore.loadCycle();
    }
  }

  private dayToAngle(day: number): number {
    const normalized = (day - 1) / this.cycleLength();
    return normalized * 360 - 90;
  }

  private describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
    const start = this.polarToCartesian(cx, cy, r, startAngle);
    const end = this.polarToCartesian(cx, cy, r, endAngle);
    const delta = endAngle - startAngle;
    const largeArcFlag = delta > 180 ? 1 : 0;

    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  }

  private polarToCartesian(cx: number, cy: number, r: number, angle: number): { x: number; y: number } {
    const radians = (angle * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(radians),
      y: cy + r * Math.sin(radians),
    };
  }

  private calculatePhaseBoundaries(length: number): {
    menstrual: { start: number; end: number };
    follicular: { start: number; end: number };
    ovulation: { start: number; end: number };
    luteal: { start: number; end: number };
  } {
    const safeLength = Math.min(40, Math.max(21, length));
    const lutealStart = safeLength - 13;
    const ovulationStart = safeLength - 16;
    const ovulationEnd = safeLength - 14;
    const menstrualEnd = Math.min(5, ovulationStart - 1);
    const follicularStart = menstrualEnd + 1;
    const follicularEnd = Math.max(follicularStart, ovulationStart - 1);

    return {
      menstrual: { start: 1, end: menstrualEnd },
      follicular: { start: follicularStart, end: follicularEnd },
      ovulation: { start: ovulationStart, end: ovulationEnd },
      luteal: { start: lutealStart, end: safeLength },
    };
  }
}
