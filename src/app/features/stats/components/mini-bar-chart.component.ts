import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface ChartBar {
  label: string;
  value: number;
  rate?: number;   // 0-1 completion rate — drives opacity
  active?: boolean; // highlight current bar
}

@Component({
  selector: 'app-mini-bar-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.viewBox]="'0 0 ' + W + ' ' + (H + 20)"
      style="width:100%;display:block;"
      aria-hidden="true"
    >
      @for (bar of bars(); track bar.label; let i = $index) {
        <rect
          [attr.x]="barX(i)"
          [attr.y]="barTopY(bar.value)"
          [attr.width]="bw()"
          [attr.height]="barH(bar.value)"
          [attr.fill]="barFill(bar)"
          [attr.rx]="2"
        />
        <text
          [attr.x]="barX(i) + bw() / 2"
          [attr.y]="H + 14"
          text-anchor="middle"
          font-size="9"
          font-family="Inter, sans-serif"
          [attr.fill]="bar.active ? 'var(--color-text)' : 'var(--color-text-secondary)'"
        >{{ bar.label }}</text>
      }
    </svg>
  `,
})
export class MiniBarChartComponent {
  readonly data = input.required<ChartBar[]>();
  readonly W = 300;
  readonly H = 72;

  private readonly PAD = 6;

  protected readonly bars = computed(() => this.data());

  protected readonly maxVal = computed(() => {
    const vals = this.data().map(d => d.value);
    return Math.max(1, ...vals);
  });

  protected bw = computed(() => {
    const n = this.data().length;
    if (n === 0) return 20;
    const slot = (this.W - this.PAD * 2) / n;
    return Math.max(6, slot * 0.75);
  });

  protected barX(i: number): number {
    const n = this.data().length;
    const slot = (this.W - this.PAD * 2) / Math.max(1, n);
    return this.PAD + i * slot + (slot - this.bw()) / 2;
  }

  protected barH(value: number): number {
    return Math.max(2, (value / this.maxVal()) * this.H);
  }

  protected barTopY(value: number): number {
    return this.H - this.barH(value);
  }

  protected barFill(bar: ChartBar): string {
    if (bar.active) return '#2d4d7a';
    const rate = bar.rate ?? 1;
    if (rate >= 0.8) return '#2d4d7a';
    if (rate >= 0.4) return 'rgba(45,77,122,0.55)';
    if (bar.value > 0) return 'rgba(45,77,122,0.28)';
    return 'rgba(45,77,122,0.12)';
  }
}
