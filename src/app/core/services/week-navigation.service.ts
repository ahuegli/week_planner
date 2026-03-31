import { Injectable, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DateCalculationService } from './date-calculation.service';
import { PlannerService } from './planner.service';

type ViewType = 'daily' | 'week' | 'month' | 'onboarding';

@Injectable({
  providedIn: 'root',
})
export class WeekNavigationService {
  private readonly dateCalc = inject(DateCalculationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly validViews = ['daily', 'week', 'month', 'onboarding'] as const;

  readonly currentView = signal<ViewType>('daily');
  readonly currentWeekOffset = signal(0);
  readonly currentMonthDate = signal<Date>(new Date());

  readonly currentWeekStart = computed(() => {
    const offset = this.currentWeekOffset();
    const weekStart = this.dateCalc.getWeekStartDate();
    weekStart.setDate(weekStart.getDate() + offset * 7);
    return weekStart;
  });

  readonly currentWeekEnd = computed(() => {
    const start = this.currentWeekStart();
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return end;
  });

  readonly currentWeekLabel = computed(() => {
    const start = this.currentWeekStart();
    const end = this.currentWeekEnd();
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${startStr} - ${endStr}`;
  });

  initFromQueryParams(params: { view?: string; week?: string }): void {
    if (params.view && this.validViews.includes(params.view as ViewType)) {
      this.currentView.set(params.view as ViewType);
    }

    if (params.week !== undefined) {
      const weekOffset = parseInt(params.week, 10);
      if (!isNaN(weekOffset)) {
        this.currentWeekOffset.set(weekOffset);
        this.syncMonthToCurrentWeek();
      }
    }
  }

  private updateQueryParams(): void {
    const queryParams: Record<string, string | number | null> = {
      view: this.currentView(),
    };

    const weekOffset = this.currentWeekOffset();
    if (weekOffset !== 0) {
      queryParams['week'] = weekOffset;
    } else {
      queryParams['week'] = null;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  showDailyView(): void {
    this.currentView.set('daily');
    this.updateQueryParams();
  }

  showWeekView(): void {
    this.currentView.set('week');
    this.updateQueryParams();
  }

  showMonthView(): void {
    this.currentView.set('month');
    this.updateQueryParams();
  }

  showOnboardingView(): void {
    this.currentView.set('onboarding');
    this.updateQueryParams();
  }

  previousWeek(): void {
    this.currentWeekOffset.update((offset) => offset - 1);
    this.syncMonthToCurrentWeek();
    this.updateQueryParams();
  }

  nextWeek(): void {
    this.currentWeekOffset.update((offset) => offset + 1);
    this.syncMonthToCurrentWeek();
    this.updateQueryParams();
  }

  goToToday(): void {
    this.currentWeekOffset.set(0);
    this.syncMonthToCurrentWeek();
    this.updateQueryParams();
  }

  previousMonth(): void {
    const current = this.currentMonthDate();
    const prev = new Date(current.getFullYear(), current.getMonth() - 1, 1);
    this.currentMonthDate.set(prev);
  }

  nextMonth(): void {
    const current = this.currentMonthDate();
    const next = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    this.currentMonthDate.set(next);
  }

  getCurrentWeekDates(): { start: Date; end: Date } {
    return this.dateCalc.getWeekDatesWithOffset(this.currentWeekOffset());
  }

  getWeekDateLabels(): string[] {
    const { start } = this.getCurrentWeekDates();
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })}`;
    });
  }

  getCurrentWeekLabel(): string {
    return this.dateCalc.getWeekLabel(this.currentWeekOffset());
  }

  getDayDate(dayIndex: number): string {
    const weekStart = this.currentWeekStart();
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + dayIndex);
    return this.dateCalc.formatDate(date);
  }

  getDayDateDisplay(dayIndex: number): string {
    const weekStart = this.currentWeekStart();
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + dayIndex);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  private syncMonthToCurrentWeek(): void {
    const { start } = this.getCurrentWeekDates();
    this.currentMonthDate.set(new Date(start.getFullYear(), start.getMonth(), 1));
  }
}
