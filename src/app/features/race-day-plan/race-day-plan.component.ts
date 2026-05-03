import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { RaceDayPlan } from '../../core/models/app-data.models';
import { DataStoreService } from '../../core/services/data-store.service';
import { RaceDayPlanApiService } from '../../core/services/race-day-plan-api.service';
import { UiFeedbackService } from '../../shared/ui-feedback.service';

interface PacingRow {
  key: 'swim' | 'bike' | 'run';
  label: string;
  target: string;
  rpe: string;
  subtitle: string;
}

interface FuelingStep {
  time: string;
  label: string;
  detail: string;
}

type HydrationConditionKey = 'cool' | 'neutral' | 'hot';

interface HydrationCondition {
  key: HydrationConditionKey;
  label: string;
  threshold: string;
  mlPerHour: string;
  electrolytes: string;
  note: string;
}

interface TransitionCard {
  key: 't1' | 't2';
  label: string;
  targetSeconds: string;
  steps: string[];
}

interface ContingencyItem {
  key: string;
  label: string;
  trigger: string;
  actions: string[];
}

@Component({
  selector: 'app-race-day-plan',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './race-day-plan.component.html',
  styleUrl: './race-day-plan.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RaceDayPlanComponent {
  private readonly raceDayPlanApi = inject(RaceDayPlanApiService);
  private readonly dataStore = inject(DataStoreService);
  private readonly uiFeedback = inject(UiFeedbackService);

  readonly planId = input.required<string>();

  protected readonly loading = signal(false);
  protected readonly generating = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly raceDayPlan = signal<RaceDayPlan | null>(null);

  protected readonly daysUntilRace = computed<number | null>(() => {
    const goalDate = this.dataStore.currentPlan()?.goalDate;
    if (!goalDate) {
      return null;
    }

    const raceDate = new Date(`${goalDate}T00:00:00`);
    if (Number.isNaN(raceDate.getTime())) {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffMs = raceDate.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  });

  protected readonly daysUntilUnlock = computed<number | null>(() => {
    const days = this.daysUntilRace();
    if (days === null) {
      return null;
    }
    return Math.max(0, days - 14);
  });

  protected readonly raceReferenceLabel = computed(() => {
    const goalDate = this.dataStore.currentPlan()?.goalDate;
    if (!goalDate) {
      return 'your race';
    }

    const raceDate = new Date(`${goalDate}T00:00:00`);
    if (Number.isNaN(raceDate.getTime())) {
      return 'your race';
    }

    return new Intl.DateTimeFormat('en-GB', {
      month: 'short',
      day: 'numeric',
    }).format(raceDate);
  });

  protected readonly showPreUnlockState = computed(() => {
    const days = this.daysUntilRace();
    return this.raceDayPlan() === null && days !== null && days > 14;
  });

  protected readonly showReadyToGenerateState = computed(() => {
    const days = this.daysUntilRace();
    return this.raceDayPlan() === null && days !== null && days <= 14;
  });

  protected readonly pacingRows = computed<PacingRow[]>(() => {
    const pacing = this.asRecord(this.raceDayPlan()?.pacingPlan);
    if (!pacing) {
      return [];
    }

    const definitions: Array<{ key: 'swim' | 'bike' | 'run'; label: string }> = [
      { key: 'swim', label: 'Swim' },
      { key: 'bike', label: 'Bike' },
      { key: 'run', label: 'Run' },
    ];

    return definitions
      .map(({ key, label }) => {
        const detail = this.asRecord(pacing[key]);
        if (!detail) {
          return null;
        }

        const target = this.asString(detail['target']) ?? 'Target pending';
        const rpe = this.asString(detail['rpe']) ?? 'RPE pending';
        const subtitle = this.asString(detail['basis']) ?? this.asString(pacing['paceBuffer']) ?? '';

        return {
          key,
          label,
          target,
          rpe,
          subtitle,
        } satisfies PacingRow;
      })
      .filter((row): row is PacingRow => row !== null);
  });

  protected readonly fuelingSteps = computed<FuelingStep[]>(() => {
    const fueling = this.asRecord(this.raceDayPlan()?.fuelingPlan);
    if (!fueling) {
      return [];
    }

    const startDetail = this.asString(fueling['preRace']) ?? 'Start settled and stay on your fueling plan.';
    const firstIntakeDetail =
      this.asString(fueling['gels'])
      ?? this.asString(fueling['onBike'])
      ?? this.asString(fueling['carbsPerHour'])
      ?? 'Take your first planned carbohydrate intake.';
    const continueDetail =
      this.asString(fueling['onRun'])
      ?? this.asString(fueling['note'])
      ?? 'Continue carbs and fluid sips at planned intervals.';

    return [
      { time: '0:00', label: 'Start', detail: startDetail },
      { time: '0:20', label: 'First intake', detail: firstIntakeDetail },
      { time: '0:40', label: 'Continue', detail: continueDetail },
    ];
  });

  protected readonly hydrationSelection = signal<HydrationConditionKey>('neutral');
  protected readonly hydrationConditions = computed<HydrationCondition[]>(() => {
    const hydration = this.asRecord(this.raceDayPlan()?.hydrationPlan);
    const conditionMap = this.asRecord(hydration?.['conditions']);

    const buildCondition = (
      key: HydrationConditionKey,
      label: string,
      fallbackThreshold: string,
      fallbackMl: string,
      fallbackElectrolytes: string,
    ): HydrationCondition => {
      const source = this.asRecord(conditionMap?.[key]);
      return {
        key,
        label,
        threshold: this.asString(source?.['threshold']) ?? fallbackThreshold,
        mlPerHour: this.asString(source?.['mlPerHour']) ?? fallbackMl,
        electrolytes: this.asString(source?.['electrolytes']) ?? fallbackElectrolytes,
        note: this.asString(source?.['note']) ?? '',
      };
    };

    return [
      buildCondition('cool', 'Cool (<15°C)', '<15°C', '500', 'Electrolytes after 90 min'),
      buildCondition('neutral', 'Neutral (15-25°C)', '15-25°C', '600', 'Electrolytes after 90 min'),
      buildCondition('hot', 'Hot (>25°C)', '>25°C', '750', 'Electrolytes from early bike segment'),
    ];
  });

  protected readonly selectedHydrationCondition = computed(() =>
    this.hydrationConditions().find((condition) => condition.key === this.hydrationSelection())
      ?? this.hydrationConditions()[1],
  );

  protected readonly transitionCards = computed<TransitionCard[]>(() => {
    const transition = this.asRecord(this.raceDayPlan()?.transitionPlan);
    if (!transition) {
      return [];
    }

    const t1 = this.asRecord(transition['t1']);
    const t2 = this.asRecord(transition['t2']);

    return [
      {
        key: 't1',
        label: 'T1',
        targetSeconds: this.asString(t1?.['targetSeconds']) ?? '-',
        steps: this.asStringArray(t1?.['steps']),
      },
      {
        key: 't2',
        label: 'T2',
        targetSeconds: this.asString(t2?.['targetSeconds']) ?? '-',
        steps: this.asStringArray(t2?.['steps']),
      },
    ];
  });

  protected readonly expandedContingencies = signal<string[]>([]);
  protected readonly contingencyItems = computed<ContingencyItem[]>(() => {
    const contingency = this.asRecord(this.raceDayPlan()?.contingencyPlan);
    if (!contingency) {
      return [];
    }

    const orderedDefinitions = [
      { key: 'cramp', label: 'Cramp' },
      { key: 'mechanical', label: 'Mechanical' },
      { key: 'missedNutrition', label: 'Missed nutrition' },
      { key: 'goingTooHard', label: 'Going too hard' },
    ];

    return orderedDefinitions
      .map(({ key, label }) => {
        const source = this.asRecord(contingency[key]);
        if (!source) {
          return null;
        }

        return {
          key,
          label,
          trigger: this.asString(source['trigger']) ?? 'Trigger not specified.',
          actions: this.asStringArray(source['action']),
        } satisfies ContingencyItem;
      })
      .filter((item): item is ContingencyItem => item !== null);
  });

  constructor() {
    effect(() => {
      const planId = this.planId();
      void this.loadForPlan(planId);
    });
  }

  protected async retryLoad(): Promise<void> {
    await this.loadForPlan(this.planId());
  }

  protected async generatePlan(): Promise<void> {
    if (this.generating()) {
      return;
    }

    this.generating.set(true);
    this.error.set(null);

    try {
      const generated = await firstValueFrom(this.raceDayPlanApi.generate(this.planId()));
      this.error.set(null);
      this.raceDayPlan.set(generated);
    } catch (error) {
      const backendMessage = this.raceDayPlanApi.getErrorMessage(error);
      const lowerMessage = backendMessage.toLowerCase();
      const feedbackMessage =
        lowerMessage.includes('triathlondistance') || lowerMessage.includes('distance')
          ? 'This plan is missing triathlon distance. Please update your plan settings or recreate it.'
          : backendMessage;

      this.error.set(feedbackMessage);
      this.uiFeedback.show(feedbackMessage, 6000);
    } finally {
      this.generating.set(false);
    }
  }

  protected generatedAtLabel(value: string | undefined): string {
    if (!value) {
      return '';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsed);
  }

  protected setHydrationSelection(key: HydrationConditionKey): void {
    this.hydrationSelection.set(key);
  }

  protected isContingencyExpanded(key: string): boolean {
    return this.expandedContingencies().includes(key);
  }

  protected toggleContingency(key: string): void {
    this.expandedContingencies.update((current) =>
      current.includes(key)
        ? current.filter((candidate) => candidate !== key)
        : [...current, key],
    );
  }

  private async loadForPlan(planId: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const plan = await firstValueFrom(this.raceDayPlanApi.getForPlan(planId));
      this.raceDayPlan.set(plan);
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        this.raceDayPlan.set(null);
      } else {
        this.error.set('Could not load race-day plan.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, unknown>;
  }

  private asString(value: unknown): string | null {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number') {
      return String(value);
    }
    return null;
  }

  private asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => this.asString(item))
      .filter((item): item is string => !!item && item.trim().length > 0);
  }
}
