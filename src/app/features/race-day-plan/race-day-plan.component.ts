import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { RaceDayPlan } from '../../core/models/app-data.models';
import { DataStoreService } from '../../core/services/data-store.service';
import { RaceDayPlanApiService } from '../../core/services/race-day-plan-api.service';
import { UiFeedbackService } from '../../shared/ui-feedback.service';

interface DisplayRow {
  label: string;
  value: string;
}

interface DisplaySection {
  key: 'pacingPlan' | 'fuelingPlan' | 'hydrationPlan' | 'transitionPlan' | 'contingencyPlan';
  title: string;
  rows: DisplayRow[];
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

  protected readonly sections = computed<DisplaySection[]>(() => {
    const plan = this.raceDayPlan();
    if (!plan) {
      return [];
    }

    return [
      { key: 'pacingPlan', title: 'Pacing', rows: this.toDisplayRows(plan.pacingPlan ?? null) },
      { key: 'fuelingPlan', title: 'Fueling', rows: this.toDisplayRows(plan.fuelingPlan ?? null) },
      { key: 'hydrationPlan', title: 'Hydration', rows: this.toDisplayRows(plan.hydrationPlan ?? null) },
      { key: 'transitionPlan', title: 'Transitions', rows: this.toDisplayRows(plan.transitionPlan ?? null) },
      { key: 'contingencyPlan', title: 'Contingencies', rows: this.toDisplayRows(plan.contingencyPlan ?? null) },
    ];
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

  private toDisplayRows(content: Record<string, unknown> | null): DisplayRow[] {
    if (!content || typeof content !== 'object') {
      return [];
    }

    const rows: DisplayRow[] = [];
    this.flattenEntries(content, '', rows);
    return rows;
  }

  private flattenEntries(value: unknown, prefix: string, rows: DisplayRow[]): void {
    if (value === null || value === undefined) {
      return;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return;
      }

      if (value.every((item) => this.isPrimitive(item))) {
        rows.push({
          label: this.prettifyKey(prefix || 'items'),
          value: value.map((item) => this.formatPrimitive(item)).join(', '),
        });
        return;
      }

      for (let i = 0; i < value.length; i += 1) {
        const itemPrefix = prefix ? `${prefix} item ${i + 1}` : `item ${i + 1}`;
        this.flattenEntries(value[i], itemPrefix, rows);
      }
      return;
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>);
      for (const [key, nested] of entries) {
        const nextPrefix = prefix ? `${prefix} ${key}` : key;
        this.flattenEntries(nested, nextPrefix, rows);
      }
      return;
    }

    rows.push({
      label: this.prettifyKey(prefix),
      value: this.formatPrimitive(value),
    });
  }

  private prettifyKey(key: string): string {
    return key
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private isPrimitive(value: unknown): boolean {
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
  }

  private formatPrimitive(value: unknown): string {
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    return String(value);
  }
}
