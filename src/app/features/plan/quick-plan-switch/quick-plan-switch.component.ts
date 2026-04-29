import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PlanApiService } from '../../../core/services/plan-api.service';
import { DataStoreService } from '../../../core/services/data-store.service';
import { PlanCreatePayload, PlanMode, TrainingPlan } from '../../../core/models/app-data.models';

type GoalMode = 'race' | 'general_fitness' | 'weight_loss';

interface RaceOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-quick-plan-switch',
  imports: [],
  templateUrl: './quick-plan-switch.component.html',
  styleUrl: './quick-plan-switch.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickPlanSwitchComponent {
  readonly open = input(false);
  readonly currentPlan = input<TrainingPlan | null>(null);
  readonly closeRequested = output<void>();
  readonly switched = output<void>();

  private readonly planApi = inject(PlanApiService);
  private readonly dataStore = inject(DataStoreService);

  protected readonly step = signal<1 | 2 | 3>(1);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly selectedGoal = signal<GoalMode>('race');
  protected readonly selectedRace = signal('Half Marathon');
  protected readonly raceDate = signal('');
  protected readonly targetTime = signal('');
  protected readonly fitnessLevel = signal('Recreational (run 2-3x/week)');

  protected readonly selectedActivities = signal<string[]>([]);
  protected readonly currentWeight = signal('');
  protected readonly targetWeight = signal('');

  protected readonly raceOptions: RaceOption[] = [
    { label: 'Marathon', value: 'Marathon' },
    { label: 'Half Marathon', value: 'Half Marathon' },
    { label: '10K', value: '10K' },
    { label: '5K', value: '5K' },
    { label: 'Triathlon (Sprint)', value: 'Triathlon (Sprint)' },
    { label: 'Triathlon (Olympic)', value: 'Triathlon (Olympic)' },
    { label: 'Triathlon (Half / 70.3)', value: 'Triathlon (Half / 70.3)' },
    { label: 'Cycling event', value: 'Cycling event' },
    { label: 'Swimming event', value: 'Swimming event' },
  ];

  protected readonly activityOptions: string[] = [
    'Running',
    'Cycling',
    'Swimming',
    'Strength Training',
    'Yoga / Pilates',
    'Hiking',
  ];

  protected readonly canGoNext = computed(() => {
    if (this.step() === 1) {
      return true;
    }

    if (this.step() === 2) {
      if (this.selectedGoal() === 'race') {
        return !!this.selectedRace();
      }

      return this.selectedActivities().length > 0;
    }

    return true;
  });

  protected readonly summaryText = computed(() => {
    if (this.selectedGoal() === 'race') {
      const date = this.raceDate() || 'No target date';
      const time = this.targetTime() || 'No target time';
      return `New goal: ${this.selectedRace()}, ${date}, Target ${time}`;
    }

    if (this.selectedGoal() === 'weight_loss') {
      const activities = this.selectedActivities().join(', ') || 'No activities selected';
      const weight = this.targetWeight() ? `${this.currentWeight()} kg to ${this.targetWeight()} kg` : `${this.currentWeight()} kg`;
      return `New goal: Weight management (${activities}), ${weight}`;
    }

    return `New goal: General fitness (${this.selectedActivities().join(', ')})`;
  });

  protected readonly modeLabel = computed(() => {
    if (this.selectedGoal() === 'race') {
      return 'Prepare for a race';
    }
    if (this.selectedGoal() === 'general_fitness') {
      return 'Stay fit & healthy';
    }
    return 'Weight management';
  });

  constructor() {
    effect(() => {
      if (this.open()) {
        this.initializeFromCurrentPlan();
      }
    });
  }

  protected initializeFromCurrentPlan(): void {
    const plan = this.currentPlan();
    this.step.set(1);
    this.errorMessage.set(null);

    if (!plan) {
      this.selectedGoal.set('race');
      this.selectedRace.set('Half Marathon');
      this.raceDate.set('');
      this.targetTime.set('');
      this.selectedActivities.set(['Running']);
      this.currentWeight.set('');
      this.targetWeight.set('');
      return;
    }

    const mode = this.toGoalMode(plan.mode);
    this.selectedGoal.set(mode);
    this.selectedRace.set(this.normalizeRaceEvent(plan.goalDistance || plan.sportType || 'Half Marathon'));
    this.raceDate.set(plan.goalDate || '');
    this.targetTime.set(plan.goalTime || '');

    const activities = this.inferActivities(plan);
    this.selectedActivities.set(activities.length > 0 ? activities : ['Running']);
  }

  protected onOverlayClick(): void {
    if (this.loading()) {
      return;
    }
    this.closeRequested.emit();
  }

  protected close(): void {
    if (this.loading()) {
      return;
    }
    this.closeRequested.emit();
  }

  protected goNext(): void {
    if (!this.canGoNext()) {
      return;
    }

    this.step.update((value) => (value < 3 ? ((value + 1) as 1 | 2 | 3) : value));
  }

  protected goBack(): void {
    this.step.update((value) => (value > 1 ? ((value - 1) as 1 | 2 | 3) : value));
  }

  protected selectGoal(mode: GoalMode): void {
    this.selectedGoal.set(mode);
  }

  protected toggleActivity(activity: string): void {
    this.selectedActivities.update((current) =>
      current.includes(activity)
        ? current.filter((value) => value !== activity)
        : [...current, activity],
    );
  }

  protected async generateNewPlan(): Promise<void> {
    const oldPlan = this.currentPlan();
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      if (oldPlan) {
        await firstValueFrom(this.planApi.deletePlan(oldPlan.id));
      }

      const payload = this.buildPlanPayload();
      const created = await this.dataStore.createPlan(payload);
      if (!created) {
        throw new Error('Could not create new plan');
      }

      await this.dataStore.generatePlanTemplate(created.id);

      await this.dataStore.scheduleEntirePlan(created.id);

      await this.dataStore.loadAll();

      this.switched.emit();
      this.closeRequested.emit();
    } catch (error) {
      console.log('Switch error:', error);
      console.error('[QuickPlanSwitch] Failed to switch plan', error);
      this.errorMessage.set('Could not switch plan. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  private buildPlanPayload(): PlanCreatePayload {
    const mode = this.selectedGoal();
    const payload: PlanCreatePayload = {
      mode,
      totalWeeks: mode === 'race' ? 12 : 8,
      currentWeek: 1,
      status: 'active',
    };

    if (mode === 'race') {
      payload.sportType = this.selectedRace();
      payload.goalDistance = this.selectedRace();
      payload.goalDate = this.raceDate() || undefined;
      payload.goalTime = this.targetTime() || undefined;
      return payload;
    }

    payload.sportType = this.selectedActivities()[0] || undefined;
    return payload;
  }

  private toGoalMode(mode: PlanMode): GoalMode {
    if (mode === 'race') {
      return 'race';
    }
    if (mode === 'weight_loss') {
      return 'weight_loss';
    }
    return 'general_fitness';
  }

  private inferActivities(plan: TrainingPlan): string[] {
    const activities: string[] = [];
    const sport = (plan.sportType || '').toLowerCase();

    if (sport.includes('run') || sport.includes('marathon') || sport.includes('5k') || sport.includes('10k')) {
      activities.push('Running');
    }
    if (sport.includes('cycl') || sport.includes('bike')) {
      activities.push('Cycling');
    }
    if (sport.includes('swim')) {
      activities.push('Swimming');
    }
    if (sport.includes('tri')) {
      activities.push('Running', 'Cycling', 'Swimming');
    }

    const workoutTypes = this.dataStore.workouts().map((workout) => workout.workoutType);
    if (workoutTypes.includes('running')) {
      activities.push('Running');
    }
    if (workoutTypes.includes('biking')) {
      activities.push('Cycling');
    }
    if (workoutTypes.includes('swimming')) {
      activities.push('Swimming');
    }
    if (workoutTypes.includes('strength')) {
      activities.push('Strength Training');
    }

    return [...new Set(activities)];
  }

  private normalizeRaceEvent(value: string): string {
    const normalized = value.trim().toLowerCase();
    if (normalized.includes('half')) {
      return 'Half Marathon';
    }
    if (normalized.includes('marathon')) {
      return 'Marathon';
    }
    if (normalized === '10k' || normalized.includes('10k')) {
      return '10K';
    }
    if (normalized === '5k' || normalized.includes('5k')) {
      return '5K';
    }
    if (normalized.includes('triathlon') && normalized.includes('sprint')) {
      return 'Triathlon (Sprint)';
    }
    if (normalized.includes('triathlon') && normalized.includes('olympic')) {
      return 'Triathlon (Olympic)';
    }
    if (normalized.includes('70.3') || normalized.includes('half')) {
      return 'Triathlon (Half / 70.3)';
    }
    if (normalized.includes('cycl')) {
      return 'Cycling event';
    }
    if (normalized.includes('swim')) {
      return 'Swimming event';
    }
    return value || 'Half Marathon';
  }
}
