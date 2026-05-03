import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, map } from 'rxjs';
import { DataStoreService } from '../../core/services/data-store.service';
import { WorkoutLogApiService } from '../../core/services/workout-log-api.service';
import { getWorkoutDescription } from '../../core/utils/workout-descriptions';
import { getWorkoutStructure, WorkoutStep } from '../../core/utils/workout-structure';
import { EnergyRating } from '../../core/models/app-data.models';

type WorkoutPageState = 'pre' | 'during' | 'post';
type StartButtonState = 'start' | 'completed';

@Component({
  selector: 'app-workout-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './workout.page.html',
  styleUrl: './workout.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkoutPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dataStore = inject(DataStoreService);
  private readonly workoutLogApi = inject(WorkoutLogApiService);

  // ── Page state ────────────────────────────────────────────────────────────

  protected readonly pageState = signal<WorkoutPageState>('pre');
  protected readonly isWhyExpanded = signal(false);
  protected readonly cyclePhaseTooltipPinned = signal(false);
  protected readonly cyclePhaseTooltipHovered = signal(false);

  private cyclePhaseTooltipTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Post-workout form ─────────────────────────────────────────────────────

  protected readonly energyRating = signal<EnergyRating | null>(null);
  protected readonly actualDuration = signal<number | null>(null);
  protected readonly actualDistance = signal<number | null>(null);
  protected readonly averagePace = signal<string>('');
  protected readonly averageSpeed = signal<number | null>(null);
  protected readonly averageHeartRate = signal<number | null>(null);
  protected readonly maxHeartRate = signal<number | null>(null);
  protected readonly calories = signal<number | null>(null);
  protected readonly elevationGain = signal<number | null>(null);
  protected readonly notes = signal<string>('');
  protected readonly isSaving = signal(false);

  // ── Route → event ─────────────────────────────────────────────────────────

  private readonly eventId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('eventId'))),
    { initialValue: null },
  );

  protected readonly event = computed(() => {
    const id = this.eventId();
    if (!id) return null;
    return this.dataStore.calendarEvents().find((e) => e.id === id) ?? null;
  });

  protected readonly notFound = computed(() => {
    const id = this.eventId();
    if (!id) return false;
    if (this.dataStore.calendarEvents().length === 0) return false;
    return this.event() === null;
  });

  protected readonly linkedSession = computed(() => {
    const event = this.event();
    if (!event) return null;
    return this.dataStore.findPlannedSessionByEventId(event.id);
  });

  protected readonly weekContext = computed(() => {
    const event = this.event();
    const dateStr = event?.date;
    if (!dateStr) return null;
    const target = new Date(`${dateStr}T00:00:00`);
    for (const week of this.dataStore.planWeeks()) {
      const start = new Date(`${week.startDate}T00:00:00`);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      if (target >= start && target <= end) {
        return { phase: week.phase, weekNumber: week.weekNumber };
      }
    }
    return null;
  });

  protected readonly durationMinutes = computed(() => {
    const event = this.event();
    if (!event) return 0;
    const [sh, sm] = event.startTime.split(':').map(Number);
    const [eh, em] = event.endTime.split(':').map(Number);
    const fromTimes = eh * 60 + em - (sh * 60 + sm);
    if (fromTimes > 0) {
      return fromTimes;
    }
    if (event.duration) return event.duration;
    return 0;
  });

  // ── Pre-workout computed ───────────────────────────────────────────────────

  protected readonly workoutSteps = computed<WorkoutStep[]>(() => {
    const event = this.event();
    if (!event) return [];
    return getWorkoutStructure(
      event.sessionType ?? event.title,
      this.durationMinutes(),
      event.intensity ?? 'moderate',
      this.linkedSession()?.paceTarget ?? null,
    );
  });

  protected readonly prescriptionDiscipline = computed(() =>
    this.linkedSession()?.discipline ?? null,
  );

  protected readonly prescription = computed(() =>
    this.linkedSession()?.prescriptionData ?? null,
  );

  protected readonly showPrescriptionCard = computed(() => {
    const d = this.prescriptionDiscipline();
    return this.prescription() !== null && (d === 'swim' || d === 'bike');
  });

  protected rxStr(key: string): string {
    const rx = this.prescription();
    if (!rx) return '';
    const val = rx[key];
    return typeof val === 'string' ? val : '';
  }

  protected rxArr(key: string): string[] {
    const rx = this.prescription();
    if (!rx) return [];
    const val = rx[key];
    return Array.isArray(val) ? (val as string[]) : [];
  }

  protected rxTargetLine(): string {
    const rx = this.prescription();
    if (!rx) return '';
    const targets = rx['targets'] as Record<string, string> | undefined;
    if (!targets) return '';
    const parts: string[] = [];
    if (targets['watts']) parts.push(targets['watts']);
    if (targets['hrBpm']) parts.push(`HR ${targets['hrBpm']}`);
    if (targets['rpe']) parts.push(`RPE ${targets['rpe']}`);
    if (targets['descriptor']) parts.push(targets['descriptor']);
    return parts.join(' · ');
  }

  protected readonly coachingNote = computed(() => {
    const event = this.event();
    if (!event) return null;
    const ctx = this.weekContext();
    const plan = this.dataStore.currentPlan();
    return getWorkoutDescription(
      event.sessionType ?? event.title,
      ctx?.phase ?? 'base',
      ctx?.weekNumber ?? 1,
      plan?.mode ?? 'race',
      plan?.sportType ?? null,
      this.durationMinutes(),
    );
  });

  protected readonly intensityLabel = computed(() => {
    const intensity = this.event()?.intensity;
    if (!intensity) return '';
    return intensity.charAt(0).toUpperCase() + intensity.slice(1);
  });

  protected readonly phaseLabel = computed(() => {
    const ctx = this.weekContext();
    if (!ctx) return '';
    const phase = ctx.phase.charAt(0).toUpperCase() + ctx.phase.slice(1);
    return `Week ${ctx.weekNumber} · ${phase} Phase`;
  });

  protected readonly startButtonState = computed<StartButtonState>(() => {
    const event = this.event();
    if (!event) return 'start';
    if (event.status === 'completed') return 'completed';
    return 'start';
  });

  // ── Post-workout computed ─────────────────────────────────────────────────

  protected readonly sportCategory = computed<'running' | 'cycling' | 'swimming' | 'strength' | 'other'>(() => {
    const event = this.event();
    if (!event) return 'other';
    if (event.workoutType === 'running') return 'running';
    if (event.workoutType === 'biking') return 'cycling';
    if (event.workoutType === 'swimming') return 'swimming';
    if (event.workoutType === 'strength' || event.workoutType === 'yoga') return 'strength';
    const planSport = (this.dataStore.currentPlan()?.sportType ?? '').toLowerCase();
    if (planSport.includes('run')) return 'running';
    if (planSport.includes('cycl') || planSport.includes('bike') || planSport.includes('tri')) return 'cycling';
    if (planSport.includes('swim')) return 'swimming';
    const s = (event.sessionType ?? event.title).toLowerCase();
    if (s.includes('run')) return 'running';
    if (s.includes('ride') || s.includes('bike')) return 'cycling';
    if (s.includes('swim')) return 'swimming';
    if (s.includes('strength') || s.includes('yoga') || s.includes('mobility')) return 'strength';
    return 'running';
  });

  protected readonly showDistance = computed(() => ['running', 'cycling', 'swimming'].includes(this.sportCategory()));
  protected readonly showPace = computed(() => this.sportCategory() === 'running');
  protected readonly showSpeed = computed(() => this.sportCategory() === 'cycling');
  protected readonly showElevation = computed(() => ['running', 'cycling'].includes(this.sportCategory()));

  protected readonly formattedEventDate = computed(() => {
    const dateStr = this.event()?.date;
    if (!dateStr) return '';
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long',
    }).format(new Date(`${dateStr}T00:00:00`));
  });

  protected readonly cyclePhaseInfo = computed<{ phase: string; cycleDay: number } | null>(() => {
    if (this.dataStore.schedulerSettings()?.cycleTrackingEnabled !== true) return null;
    const profile = this.dataStore.cycleProfile();
    if (!profile?.lastPeriodStart || profile.mode !== 'natural') return null;
    const dateStr = this.event()?.date;
    if (!dateStr) return null;

    const eventDate = new Date(`${dateStr}T00:00:00`);
    const periodStart = new Date(`${profile.lastPeriodStart}T00:00:00`);
    const cycleLength = Math.max(21, profile.averageCycleLength || 28);
    const diffDays = Math.floor((eventDate.getTime() - periodStart.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays < 0) return null;

    const cycleDay = (diffDays % cycleLength) + 1;
    const lutealStart = cycleLength - 13;
    const ovulationStart = Math.max(6, lutealStart - 3);

    let phase: string;
    if (cycleDay <= 5) phase = 'menstrual';
    else if (cycleDay >= lutealStart) phase = 'luteal';
    else if (cycleDay >= ovulationStart && cycleDay < lutealStart) phase = 'ovulation';
    else phase = 'follicular';

    return { phase, cycleDay };
  });

  protected readonly cyclePhaseLabel = computed(() => {
    const info = this.cyclePhaseInfo();
    if (!info) return null;
    const names: Record<string, string> = {
      menstrual: 'Menstrual', follicular: 'Follicular',
      ovulation: 'Ovulation', luteal: 'Luteal',
    };
    return `${names[info.phase] ?? info.phase} Phase · Day ${info.cycleDay}`;
  });

  protected readonly cyclePhaseTooltipOpen = computed(
    () => this.cyclePhaseTooltipPinned() || this.cyclePhaseTooltipHovered(),
  );

  protected readonly cyclePhaseTooltipText = computed(() => {
    const phase = this.cyclePhaseInfo()?.phase;
    if (!phase) {
      return null;
    }

    const descriptions: Record<string, string> = {
      menstrual: 'Days 1-5 typically. Energy may be lower; rest guilt-free if needed. Light movement is fine.',
      follicular: 'Days 6-13 typically. Your strongest training window. Push intervals and hard sessions here.',
      ovulation: 'Days 14-16 typically. Peak power and strength. Great for time trials and key sessions.',
      luteal: 'Days 17-28 typically. Energy may dip mid-session. Effort over pace today; aerobic work shines.',
    };

    return descriptions[phase] ?? null;
  });

  protected readonly cycleCoachingNote = computed<string | null>(() => {
    const info = this.cyclePhaseInfo();
    if (!info) return null;
    const notes: Record<string, string> = {
      menstrual: "You're in your menstrual phase — listen to your body. It's okay to reduce intensity or take an extra rest day.",
      follicular: 'Follicular phase — your strongest training window. Great time for this session.',
      ovulation: 'Ovulation phase — still strong but be extra careful with warm-ups. Joint laxity is slightly higher.',
      luteal: 'Luteal phase — energy may be lower. Focus on effort level rather than pace targets.',
    };
    return notes[info.phase] ?? null;
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  constructor() {
    if (!this.dataStore.isLoaded()) {
      this.dataStore.loadAll();
    }
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      this.closeCyclePhaseTooltip();
      return;
    }

    if (!target.closest('.cycle-phase-tooltip')) {
      this.closeCyclePhaseTooltip();
    }
  }

  // ── Pre-workout actions ───────────────────────────────────────────────────

  protected goBack(): void {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.router.navigate(['/today']);
    }
  }

  protected toggleWhy(): void {
    this.isWhyExpanded.update((v) => !v);
  }

  protected toggleCyclePhaseTooltip(event: Event): void {
    event.stopPropagation();
    const nextValue = !this.cyclePhaseTooltipPinned();
    this.cyclePhaseTooltipPinned.set(nextValue);

    if (nextValue) {
      this.startCyclePhaseTooltipTimer();
      return;
    }

    this.clearCyclePhaseTooltipTimer();
  }

  protected showCyclePhaseTooltipOnHover(): void {
    this.cyclePhaseTooltipHovered.set(true);
  }

  protected hideCyclePhaseTooltipOnHover(): void {
    this.cyclePhaseTooltipHovered.set(false);
  }

  protected askCoach(): void {
    const title = this.event()?.title;
    const context = title ? encodeURIComponent(title) : undefined;
    const url = context ? `/coach?workout=${context}` : '/coach';
    void this.router.navigateByUrl(url);
  }

  protected goToPostWorkout(): void {
    this.actualDuration.set(this.durationMinutes());
    this.pageState.set('post');
  }

  protected backToPreWorkout(): void {
    this.pageState.set('pre');
  }

  // ── Post-workout actions ──────────────────────────────────────────────────

  protected parseNumber(value: string): number | null {
    const n = parseFloat(value);
    return isNaN(n) ? null : n;
  }

  protected async saveAndFinish(): Promise<void> {
    const rating = this.energyRating();
    if (!rating || this.isSaving()) return;
    const event = this.event();
    if (!event) return;

    this.isSaving.set(true);
    try {
      const session = this.linkedSession();
      const paceStr = this.averagePace().trim();

      await firstValueFrom(
        this.workoutLogApi.create({
          plannedSessionId: session?.id,
          calendarEventId: event.id,
          sessionType: event.sessionType ?? event.title,
          sportType: event.workoutType,
          energyRating: rating,
          plannedDuration: this.durationMinutes(),
          actualDuration: this.actualDuration() ?? undefined,
          actualDistance: this.actualDistance() ?? undefined,
          averagePace: paceStr || undefined,
          averageSpeed: this.averageSpeed() ?? undefined,
          averageHeartRate: this.averageHeartRate() ?? undefined,
          maxHeartRate: this.maxHeartRate() ?? undefined,
          calories: this.calories() ?? undefined,
          elevationGain: this.elevationGain() ?? undefined,
          notes: this.notes().trim() || undefined,
          endedEarly: false,
          completedAt: new Date().toISOString(),
        }),
      );

      if (session) {
        await this.dataStore.completeSession(session.id, rating);
      }
      await this.dataStore.updateCalendarEvent(event.id, { status: 'completed' });
    } catch (err) {
      console.error('[WorkoutPage] Save failed', err);
    } finally {
      this.isSaving.set(false);
    }

    this.goBack();
  }

  protected async skipLogging(): Promise<void> {
    if (this.isSaving()) return;
    const event = this.event();
    if (!event) return;
    const rating = this.energyRating() ?? 'moderate';

    this.isSaving.set(true);
    try {
      const session = this.linkedSession();
      if (session) {
        await this.dataStore.completeSession(session.id, rating);
      }
      await this.dataStore.updateCalendarEvent(event.id, { status: 'completed' });
    } catch (err) {
      console.error('[WorkoutPage] Skip logging failed', err);
    } finally {
      this.isSaving.set(false);
    }

    this.goBack();
  }

  private startCyclePhaseTooltipTimer(): void {
    this.clearCyclePhaseTooltipTimer();
    this.cyclePhaseTooltipTimer = setTimeout(() => {
      this.cyclePhaseTooltipPinned.set(false);
      this.cyclePhaseTooltipTimer = null;
    }, 5000);
  }

  private clearCyclePhaseTooltipTimer(): void {
    if (this.cyclePhaseTooltipTimer) {
      clearTimeout(this.cyclePhaseTooltipTimer);
      this.cyclePhaseTooltipTimer = null;
    }
  }

  private closeCyclePhaseTooltip(): void {
    this.cyclePhaseTooltipPinned.set(false);
    this.cyclePhaseTooltipHovered.set(false);
    this.clearCyclePhaseTooltipTimer();
  }
}
