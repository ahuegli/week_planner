import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { cycleTrackingEnabled } from '../shared/state/cycle-ui.state';
import { AuthService } from '../core/services/auth.service';
import { DataStoreService } from '../core/services/data-store.service';
import { CycleProfile } from '../core/models/app-data.models';

@Component({
  selector: 'app-settings-page',
  imports: [RouterLink, DatePipe, TitleCasePipe],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPageComponent {
  constructor(
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly dataStore: DataStoreService,
  ) {
    void this.loadSettings();
  }
  protected readonly openSections = signal<string[]>(['general']);
  protected readonly saveStatus = signal<'idle' | 'saving' | 'saved'>('idle');
  protected readonly shiftUpdateMessage = signal<string | null>(null);
  protected readonly shiftConflictCount = signal(0);
  protected readonly showRescheduleChoice = signal(false);

  protected readonly currentPlan = computed(() => this.dataStore.currentPlan());

  protected readonly planPhase = computed(() => {
    const plan = this.currentPlan();
    if (!plan?.weeks?.length) return null;
    return plan.weeks.find(w => w.weekNumber === plan.currentWeek)?.phase ?? null;
  });

  protected readonly planProgressPct = computed(() => {
    const plan = this.currentPlan();
    if (!plan || plan.totalWeeks === 0) return 0;
    return Math.round((plan.currentWeek / plan.totalWeeks) * 100);
  });

  protected readonly darkMode = signal(false);
  protected readonly workoutReminders = signal(true);
  protected readonly checkinPrompts = signal(true);
  protected readonly weeklySummary = signal(true);
  protected readonly checkInHours = signal(2);

  protected readonly availableTrainingDays = signal(4);
  protected readonly preferredTimes = signal<string[]>(['Morning (7-9)', 'Evening (17-19)']);

  protected readonly shiftPattern = signal<'fixed' | 'rotating' | 'irregular'>('fixed');
  protected readonly defaultShiftName = signal('Early Shift');
  protected readonly defaultShiftStart = signal('08:00');
  protected readonly defaultShiftEnd = signal('17:00');
  protected readonly shiftDays = signal<string[]>(['Mo', 'Tu', 'We', 'Th', 'Fr']);
  protected readonly commuteMinutes = signal(30);
  protected readonly bedtime = signal('23:00');
  protected readonly wakeTime = signal('07:00');

  protected readonly workoutTypes = signal<Record<string, boolean>>({
    Running: true,
    Cycling: true,
    Swimming: false,
    Strength: true,
    'Yoga / Pilates': false,
    Bouldering: false,
    Other: false,
  });
  protected readonly otherWorkoutType = signal('');
  protected readonly sessionsPerWeekTarget = signal(4);

  protected readonly restDaysPerWeek = signal(1);
  protected readonly minRestGap = signal('3 hours');
  protected readonly runningThresholdMinutes = signal(60);
  protected readonly runningThresholdDistance = signal(15);
  protected readonly cyclingThresholdMinutes = signal(90);
  protected readonly cyclingThresholdDistance = signal(40);
  protected readonly swimmingThresholdMinutes = signal(60);
  protected readonly swimmingThresholdDistance = signal(3);

  protected readonly mealPrepPerWeek = signal('2');
  protected readonly mealPrepDuration = signal('1 hour');
  protected readonly mealPrepWeekends = signal(true);
  protected readonly fridgeMateConnected = signal(false);

  protected readonly cycleTrackingEnabled = cycleTrackingEnabled;
  protected readonly cycleAwareSchedulingEnabled = computed(
    () => this.dataStore.schedulerSettings()?.cycleTrackingEnabled ?? false,
  );
  protected readonly cycleStatus = signal<'regular' | 'irregular' | 'hormonal' | 'menopause'>('regular');
  protected readonly cycleLastPeriod = signal('');
  protected readonly cycleLength = signal(28);

  protected readonly accountEmail = signal('you@example.com');
  protected readonly accountName = signal('Alex Runner');

  protected readonly schedulePriority = [
    'Sport / Workouts',
    'Recovery',
    'Meal Prep',
  ];

  protected readonly timeOptions = [
    'Early morning (5-7)',
    'Morning (7-9)',
    'Afternoon (12-14)',
    'Evening (17-19)',
    'Late evening (19-21)',
    'Flexible',
  ];

  protected readonly thresholdRestOptions = ['2 hours', '3 hours', '4 hours'];
  protected readonly mealPrepSegments = ['None', '1', '2', '3+'];

  protected toggleSection(key: string): void {
    this.openSections.update((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }

  protected isOpen(key: string): boolean {
    return this.openSections().includes(key);
  }

  protected toggleSignal(target: ReturnType<typeof signal<boolean>>): void {
    target.update((value) => !value);
  }

  protected adjustSignal(target: ReturnType<typeof signal<number>>, delta: number, min: number, max: number): void {
    target.update((value) => Math.max(min, Math.min(max, value + delta)));
  }

  protected togglePreferredTime(label: string): void {
    const current = this.preferredTimes();
    const next = current.includes(label)
      ? current.filter((item) => item !== label)
      : [...current, label];
    this.preferredTimes.set(next);
  }

  protected toggleShiftDay(day: string): void {
    const current = this.shiftDays();
    this.shiftDays.set(
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day],
    );
  }

  protected toggleWorkoutType(key: string): void {
    this.workoutTypes.update((current) => ({ ...current, [key]: !current[key] }));
  }

  protected setMealPrepSessions(value: string): void {
    this.mealPrepPerWeek.set(value);
  }

  protected async toggleCycleAwareScheduling(): Promise<void> {
    const oldValue = this.dataStore.schedulerSettings()?.cycleTrackingEnabled ?? false;
    const newValue = !oldValue;
    await this.dataStore.updateSchedulerSettings({ cycleTrackingEnabled: newValue });
    const plan = this.dataStore.currentPlan();
    if (plan && confirm('Cycle tracking changed — reschedule this week to apply?')) {
      await this.dataStore.rescheduleConflicts(plan.id);
    }
  }

  protected async saveSettings(): Promise<void> {
    this.saveStatus.set('saving');
    this.shiftUpdateMessage.set(null);

    try {
      const mealPrepDuration = this.mealPrepDuration().includes('hour')
        ? Number(this.mealPrepDuration().replace(/[^0-9]/g, '')) * 60
        : Number(this.mealPrepDuration().replace(/[^0-9]/g, ''));

      await this.dataStore.updateSchedulerSettings({
        enduranceWorkoutMinDuration: this.runningThresholdMinutes(),
        beforeShiftBufferMinutes: this.commuteMinutes(),
        afterShiftBufferMinutes: this.commuteMinutes(),
      });

      await this.dataStore.updateMealprepSettings({
        duration: Number.isFinite(mealPrepDuration) && mealPrepDuration > 0 ? mealPrepDuration : 90,
        sessionsPerWeek: Number(this.mealPrepPerWeek()) || 2,
      });

      const selectedShiftDays = this.shiftDays()
        .map((label) => this.dayLabelToIndex(label))
        .filter((day): day is number => day !== null);

      this.shiftUpdateMessage.set('Shifts updated - rescheduling your workouts...');
      const shiftSyncResult = await this.dataStore.syncRecurringShiftsAndReschedule({
        title: this.defaultShiftName(),
        startTime: this.defaultShiftStart(),
        endTime: this.defaultShiftEnd(),
        commuteMinutes: this.commuteMinutes(),
        dayIndices: this.shiftPattern() === 'irregular' ? [] : selectedShiftDays,
      });

      const rescheduleResult = shiftSyncResult.reschedule;
      const affected = rescheduleResult?.workoutsRescheduled ?? 0;
      if (affected > 0) {
        this.shiftConflictCount.set(affected);
        this.showRescheduleChoice.set(true);
        this.shiftUpdateMessage.set(null);
      } else {
        this.shiftUpdateMessage.set('Shift updated — no workout conflicts found.');
        this.showRescheduleChoice.set(false);
      }

      if (this.cycleTrackingEnabled()) {
        await this.dataStore.updateCycleProfile(this.toCycleProfilePatch());
        await this.dataStore.loadCycle();
      } else {
        this.dataStore.cycleProfile.set(null);
        this.dataStore.currentPhase.set(null);
      }

      this.saveStatus.set('saved');
      setTimeout(() => this.saveStatus.set('idle'), 1500);
    } catch (error) {
      console.error('[Settings] Failed to save settings', error);
      this.shiftUpdateMessage.set('Could not save shift updates. Please try again.');
      this.saveStatus.set('idle');
    }
  }

  protected logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }

  protected planModeLabel(mode: string): string {
    const map: Record<string, string> = {
      race: 'RACE',
      general_fitness: 'FITNESS',
      weight_loss: 'WEIGHT LOSS',
    };
    return map[mode] ?? mode.toUpperCase();
  }

  protected planSportLabel(sport: string | null | undefined): string {
    const map: Record<string, string> = {
      running: 'Running',
      biking: 'Cycling',
      swimming: 'Swimming',
      strength: 'Strength',
      yoga: 'Yoga & Mobility',
    };
    return sport ? (map[sport] ?? sport) : '';
  }

  protected async applyShiftReschedule(): Promise<void> {
    this.showRescheduleChoice.set(false);
    const plan = this.dataStore.currentPlan();
    if (!plan) {
      this.shiftUpdateMessage.set('No active plan to reschedule.');
      return;
    }
    try {
      await this.dataStore.rescheduleConflicts(plan.id);
      this.shiftUpdateMessage.set('Done — workouts rescheduled around the new shift times.');
    } catch {
      this.shiftUpdateMessage.set('Could not reschedule. Try again from the week view.');
    }
  }

  protected dismissReschedule(): void {
    this.showRescheduleChoice.set(false);
    this.shiftUpdateMessage.set(`Shift saved. ${this.shiftConflictCount()} workout(s) may overlap — adjust manually.`);
    this.shiftConflictCount.set(0);
  }

  protected editPlan(): void {
    console.log('Edit plan — should pre-fill with current data');
    void this.router.navigate(['/onboarding']);
  }

  protected startNewPlan(): void {
    console.log('Create new plan — fresh start');
    void this.router.navigate(['/onboarding']);
  }

  protected createPlan(): void {
    console.log('Create new plan — fresh start');
    void this.router.navigate(['/onboarding']);
  }

  protected navigateToPlan(): void {
    console.log('Navigate to Plan tab');
    void this.router.navigate(['/plan']);
  }

  protected openCoachCycleAdjustment(): void {
    console.log('Open coach for cycle adjustment');
  }

  protected deleteAccount(): void {
    console.log('Delete account requested');
  }

  private async loadSettings(): Promise<void> {
    await this.dataStore.loadAll();

    const scheduler = this.dataStore.schedulerSettings();
    const mealprep = this.dataStore.mealprepSettings();

    if (scheduler) {
      this.runningThresholdMinutes.set(scheduler.enduranceWorkoutMinDuration);
    }

    if (mealprep) {
      this.mealPrepPerWeek.set(String(mealprep.sessionsPerWeek));
      this.mealPrepDuration.set(`${mealprep.duration} min`);
    }

    const repeatingShifts = this.dataStore
      .calendarEvents()
      .filter((event) => event.type === 'shift' && event.isRepeatingWeekly)
      .sort((a, b) => a.day - b.day || a.startTime.localeCompare(b.startTime));

    if (repeatingShifts.length > 0) {
      const canonical = repeatingShifts[0];
      const dayLabels = repeatingShifts
        .map((shift) => this.dayIndexToLabel(shift.day))
        .filter((label): label is string => !!label);

      this.defaultShiftName.set(canonical.title);
      this.defaultShiftStart.set(canonical.startTime);
      this.defaultShiftEnd.set(canonical.endTime);
      this.shiftDays.set([...new Set(dayLabels)]);
      this.commuteMinutes.set(canonical.commuteMinutes ?? this.commuteMinutes());
    }

    if (this.cycleTrackingEnabled()) {
      await this.dataStore.loadCycle();
      this.applyCycleProfileToUi(this.dataStore.cycleProfile());
    }
  }

  private applyCycleProfileToUi(profile: CycleProfile | null): void {
    if (!profile) {
      return;
    }

    const status = this.toCycleStatus(profile);
    this.cycleStatus.set(status);
    this.cycleLastPeriod.set(profile.lastPeriodStart ?? '');
    this.cycleLength.set(profile.averageCycleLength || 28);
  }

  private toCycleStatus(profile: CycleProfile): 'regular' | 'irregular' | 'hormonal' | 'menopause' {
    if (profile.mode === 'hormonal_contraception') {
      return 'hormonal';
    }

    if (profile.mode === 'perimenopause') {
      return 'menopause';
    }

    if (profile.variability === 'high' || profile.variability === 'medium') {
      return 'irregular';
    }

    return 'regular';
  }

  private toCycleProfilePatch(): Partial<CycleProfile> {
    let mode: CycleProfile['mode'] = 'natural';
    let variability: CycleProfile['variability'] = 'low';

    if (this.cycleStatus() === 'hormonal') {
      mode = 'hormonal_contraception';
      variability = 'low';
    } else if (this.cycleStatus() === 'menopause') {
      mode = 'perimenopause';
      variability = 'medium';
    } else if (this.cycleStatus() === 'irregular') {
      mode = 'natural';
      variability = 'high';
    }

    return {
      mode,
      variability,
      averageCycleLength: this.cycleLength(),
      lastPeriodStart: this.cycleLastPeriod() || null,
    };
  }

  private dayLabelToIndex(label: string): number | null {
    const mapping: Record<string, number> = {
      Mo: 0,
      Tu: 1,
      We: 2,
      Th: 3,
      Fr: 4,
      Sa: 5,
      Su: 6,
    };

    return mapping[label] ?? null;
  }

  private dayIndexToLabel(day: number): string | null {
    const mapping: Record<number, string> = {
      0: 'Mo',
      1: 'Tu',
      2: 'We',
      3: 'Th',
      4: 'Fr',
      5: 'Sa',
      6: 'Su',
    };

    return mapping[day] ?? null;
  }
}
