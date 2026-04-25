import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CycleCurrentPhase } from '../../../core/models/app-data.models';

const PHASE_COLORS: Record<string, string> = {
  menstrual:  '#A85454',
  follicular: '#2d4d7a',
  ovulation:  '#C4923A',
  luteal:     '#6B7F5E',
  unknown: '#9ca3af',
};

const PHASE_LABELS: Record<string, string> = {
  menstrual:  'Menstrual',
  follicular: 'Follicular',
  ovulation:  'Ovulation',
  luteal:     'Luteal',
  unknown: 'Unknown',
};

@Component({
  selector: 'app-cycle-banner',
  standalone: true,
  templateUrl: './cycle-banner.component.html',
  styleUrl: './cycle-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CycleBannerComponent {
  readonly cycleInfo = input.required<CycleCurrentPhase>();

  protected readonly phaseColor = computed(() => PHASE_COLORS[this.cycleInfo().phase] ?? '#9ca3af');
  protected readonly phaseLabel = computed(() => PHASE_LABELS[this.cycleInfo().phase] ?? 'Unknown');
}
