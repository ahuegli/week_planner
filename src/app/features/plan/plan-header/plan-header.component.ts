import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PlanPhaseInfo, TrainingPlan } from '../../../core/models/app-data.models';

@Component({
  selector: 'app-plan-header',
  imports: [],
  templateUrl: './plan-header.component.html',
  styleUrl: './plan-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanHeaderComponent {
  readonly plan = input.required<TrainingPlan>();

  protected readonly modeBadgeLabel = computed(() => {
    switch (this.plan().mode) {
      case 'race':
        return 'RACE';
      case 'general_fitness':
        return 'FITNESS';
      case 'weight_loss':
        return 'WEIGHT LOSS';
    }
  });

  protected readonly sportTypeLabel = computed(() => {
    const map: Record<string, string> = {
      half_marathon: 'Half Marathon',
      marathon: 'Marathon',
      triathlon_olympic: 'Olympic Triathlon',
      triathlon_sprint: 'Sprint Triathlon',
      cycling: 'Cycling Event',
    };
    return map[this.plan().sportType ?? ''] ?? this.plan().sportType ?? '';
  });

  protected readonly goalDateLabel = computed(() => {
    const goalDate = this.plan().goalDate;
    if (!goalDate) {
      return 'No target date';
    }

    const d = new Date(`${goalDate}T00:00:00`);
    if (Number.isNaN(d.getTime())) {
      return 'No target date';
    }

    return new Intl.DateTimeFormat('en-GB', { month: 'long', day: 'numeric', year: 'numeric' }).format(d);
  });

  protected readonly currentPhaseLabel = computed(() => {
    const plan = this.plan();
    const phases = this.resolvePhases(plan);
    const phase = phases.find(
      (p) => plan.currentWeek >= p.startWeek && plan.currentWeek <= p.endWeek,
    );
    if (!phase) return '';
    return phase.name.charAt(0).toUpperCase() + phase.name.slice(1) + ' Phase';
  });

  protected readonly progressPercent = computed(() => {
    const p = this.plan();
    return Math.round((p.currentWeek / p.totalWeeks) * 100);
  });

  protected readonly weeksRemaining = computed(() => {
    const p = this.plan();
    return p.totalWeeks - p.currentWeek;
  });

  protected readonly phaseSegments = computed(() => {
    const p = this.plan();
    const phases = this.resolvePhases(p);
    const colors: Record<string, string> = {
      base: '#7BA1C7',
      build: 'var(--color-primary)',
      peak: '#1e3554',
      taper: '#A0B4C7',
      maintenance: '#A0B4C7',
    };
    return phases.map((phase) => ({
      name: phase.name,
      width: ((phase.endWeek - phase.startWeek + 1) / p.totalWeeks) * 100,
      color: colors[phase.name] ?? 'var(--color-primary)',
    }));
  });

  protected readonly markerPercent = computed(() => {
    const p = this.plan();
    return ((p.currentWeek - 0.5) / p.totalWeeks) * 100;
  });

  private resolvePhases(plan: TrainingPlan): PlanPhaseInfo[] {
    if (plan.phases?.length) {
      return plan.phases;
    }

    return [{ name: 'base', startWeek: 1, endWeek: plan.totalWeeks }];
  }
}
