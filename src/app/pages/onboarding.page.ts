import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OnboardingStepAvailabilityComponent } from '../features/onboarding/onboarding-step-availability.component';
import { OnboardingStepCycleComponent } from '../features/onboarding/onboarding-step-cycle.component';
import { OnboardingStepGoalComponent } from '../features/onboarding/onboarding-step-goal.component';
import { OnboardingStepSportComponent } from '../features/onboarding/onboarding-step-sport.component';
import { OnboardingStepSummaryComponent } from '../features/onboarding/onboarding-step-summary.component';
import { OnboardingStepWelcomeComponent } from '../features/onboarding/onboarding-step-welcome.component';
import { OnboardingStepWorkComponent } from '../features/onboarding/onboarding-step-work.component';
import { CycleStatus, DEFAULT_ONBOARDING_DATA, GoalMode, OnboardingData } from '../features/onboarding/onboarding.models';
import { cycleTrackingEnabled } from '../shared/state/cycle-ui.state';
import { DataStoreService } from '../core/services/data-store.service';
import { PlanMode } from '../core/models/app-data.models';

@Component({
  selector: 'app-onboarding-page',
  imports: [
    OnboardingStepWelcomeComponent,
    OnboardingStepGoalComponent,
    OnboardingStepSportComponent,
    OnboardingStepAvailabilityComponent,
    OnboardingStepWorkComponent,
    OnboardingStepCycleComponent,
    OnboardingStepSummaryComponent,
  ],
  templateUrl: './onboarding.page.html',
  styleUrl: './onboarding.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingPageComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dataStore = inject(DataStoreService);
  private readonly sharedCycleTrackingEnabled = cycleTrackingEnabled;

  protected readonly totalSteps = 7;
  protected readonly currentStep = signal(1);
  protected readonly loading = signal(false);
  protected readonly onboardingData = signal<OnboardingData>(DEFAULT_ONBOARDING_DATA);

  constructor() {
    const goal = this.route.snapshot.queryParamMap.get('goal');
    if (goal === 'race' || goal === 'fitness' || goal === 'weight_loss') {
      this.patchData({ goal });
    }
  }

  protected setGoal(goal: GoalMode): void {
    this.patchData({ goal });
  }

  protected patchData(patch: Partial<OnboardingData>): void {
    if (typeof patch.cycleEnabled === 'boolean') {
      this.sharedCycleTrackingEnabled.set(patch.cycleEnabled);
    }
    this.onboardingData.update((current) => ({ ...current, ...patch }));
  }

  protected nextStep(): void {
    this.currentStep.update((step) => Math.min(this.totalSteps, step + 1));
  }

  protected backStep(): void {
    this.currentStep.update((step) => Math.max(1, step - 1));
  }

  protected goToStep(step: number): void {
    this.currentStep.set(Math.min(this.totalSteps, Math.max(1, step)));
  }

  protected skipCycleStep(): void {
    this.patchData({ cycleEnabled: false });
    this.nextStep();
  }

  protected restart(): void {
    this.onboardingData.set(DEFAULT_ONBOARDING_DATA);
    this.currentStep.set(1);
    this.loading.set(false);
  }

  protected async generatePlan(): Promise<void> {
    const summary = {
      goal: this.onboardingData().goal,
      raceEvent: this.onboardingData().raceEvent,
      activities: this.onboardingData().activities,
      trainingDays: this.onboardingData().trainingDays,
      preferredTimes: this.onboardingData().preferredTimes,
      shiftPattern: this.onboardingData().shiftPattern,
      cycle: {
        enabled: this.onboardingData().cycleEnabled,
        status: this.onboardingData().cycleStatus,
        length: this.onboardingData().cycleLength,
      },
    };

    this.loading.set(true);

    const data = this.onboardingData();
    const mode = this.resolvePlanMode(data.goal);
    const totalWeeks = mode === 'race' ? 12 : 8;

    await this.persistOnboardingShifts(data);

    const createdPlan = await this.dataStore.createPlan({
      mode,
      sportType: this.resolveSportType(data),
      goalDate: data.raceDate || undefined,
      goalDistance: data.raceEvent || undefined,
      goalTime: data.targetTime || undefined,
      totalWeeks,
      currentWeek: 1,
      status: 'active',
    });

    if (!createdPlan) {
      this.loading.set(false);
      return;
    }

    await this.dataStore.generatePlanTemplate(createdPlan.id);
    await this.dataStore.scheduleEntirePlan(createdPlan.id);

    await this.dataStore.updateSchedulerSettings({ cycleTrackingEnabled: data.cycleEnabled });
    if (data.cycleEnabled) {
      const cycleBackendData = this.mapCycleStatusToBackendMode(data.cycleStatus);
      await this.dataStore.updateCycleProfile({
        mode: cycleBackendData.mode,
        variability: cycleBackendData.variability,
        averageCycleLength: data.cycleLength,
        lastPeriodStart: data.lastPeriodDate || null,
      });
    }

    this.sharedCycleTrackingEnabled.set(data.cycleEnabled);
    this.loading.set(false);

    if (!this.dataStore.currentPlan()) {
      return;
    }

    await this.router.navigateByUrl('/plan');
  }

  private mapCycleStatusToBackendMode(status: CycleStatus): {
    mode: 'natural' | 'hormonal_contraception' | 'perimenopause' | 'manual';
    variability: 'low' | 'medium' | 'high';
  } {
    switch (status) {
      case 'regular': return { mode: 'natural', variability: 'low' };
      case 'irregular': return { mode: 'natural', variability: 'high' };
      case 'hormonal': return { mode: 'hormonal_contraception', variability: 'low' };
      case 'menopause': return { mode: 'perimenopause', variability: 'high' };
    }
  }

  private resolvePlanMode(goal: GoalMode): PlanMode {
    if (goal === 'race') {
      return 'race';
    }

    if (goal === 'fitness') {
      return 'general_fitness';
    }

    return 'weight_loss';
  }

  private resolveSportType(data: OnboardingData): string | undefined {
    if (data.goal !== 'race') {
      return data.activities[0] || undefined;
    }

    if (data.raceEvent === 'Other') {
      return data.raceOther || undefined;
    }

    return data.raceEvent || undefined;
  }

  private async persistOnboardingShifts(data: OnboardingData): Promise<void> {
    if (data.shiftPattern !== 'fixed' && data.shiftPattern !== 'rotating') {
      return;
    }

    await this.dataStore.loadAll();

    const existingShifts = this.dataStore
      .calendarEvents()
      .filter((event) => event.type === 'shift');

    // Onboarding should establish a clean recurring shift template set.
    for (const event of existingShifts) {
      await this.dataStore.deleteCalendarEvent(event.id);
    }

    for (const shift of data.shifts) {
      for (const dayLabel of shift.days) {
        const dayIndex = this.dayIndexFromLabel(dayLabel);
        if (dayIndex === null) {
          continue;
        }

        await this.dataStore.addCalendarEvent({
          title: shift.name,
          type: 'shift',
          day: dayIndex,
          startTime: shift.startTime,
          endTime: shift.endTime,
          commuteMinutes: data.commuteMinutes,
          isRepeatingWeekly: true,
        });
      }
    }
  }

  private dayIndexFromLabel(label: string): number | null {
    const map: Record<string, number> = {
      Mo: 0,
      Tu: 1,
      We: 2,
      Th: 3,
      Fr: 4,
      Sa: 5,
      Su: 6,
    };

    return map[label] ?? null;
  }
}
