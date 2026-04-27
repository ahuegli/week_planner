import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CalendarEvent } from '../../mock-data';
import { DataStoreService } from '../../core/services/data-store.service';
import { UiFeedbackService } from '../ui-feedback.service';

type EventFormValue = {
  title: string;
  startTime: string;
  endTime: string;
  commuteMinutes: string;
  duration: string;
  distanceTarget: string;
  intensity: '' | NonNullable<CalendarEvent['intensity']>;
  priority: '' | NonNullable<CalendarEvent['priority']>;
  sessionType: string;
};

@Component({
  selector: 'app-event-detail-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './event-detail-modal.component.html',
  styleUrl: './event-detail-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventDetailModalComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly dataStore = inject(DataStoreService);
  private readonly uiFeedback = inject(UiFeedbackService);
  private readonly weekDayLabels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  readonly open = input(false);
  readonly event = input<CalendarEvent | null>(null);
  readonly showSuggestedSlotNote = input(false);

  readonly closeRequested = output<void>();
  readonly saveRequested = output<CalendarEvent>();
  readonly deleteRequested = output<string>();
  protected readonly selectedDay = signal<number | null>(null);
  protected readonly showInviteDialog = signal(false);
  protected readonly inviteEmail = signal('');
  protected readonly inviteMessage = signal('');
  protected readonly inviteSending = signal(false);
  protected readonly inviteError = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    title: '',
    startTime: '',
    endTime: '',
    commuteMinutes: '',
    duration: '',
    distanceTarget: '',
    intensity: '' as EventFormValue['intensity'],
    priority: '' as EventFormValue['priority'],
    sessionType: '',
  });

  protected readonly canInvite = computed(() => {
    const t = this.event()?.type;
    return t === 'workout' || t === 'custom-event' || t === 'personal';
  });

  protected readonly isWorkout = computed(() => this.event()?.type === 'workout');
  protected readonly isShift = computed(() => this.event()?.type === 'shift');
  protected readonly isMealPrep = computed(() => this.event()?.type === 'mealprep');
  protected readonly isPersonal = computed(() => this.event()?.type === 'personal');
  protected readonly typeLabel = computed(() => {
    switch (this.event()?.type) {
      case 'workout':
        return 'Workout';
      case 'shift':
        return 'Shift';
      case 'mealprep':
        return 'Meal Prep';
      case 'personal':
        return 'Personal Event';
      case 'oncall':
        return 'On-call';
      default:
        return 'Event';
    }
  });

  protected readonly weekDayPills = computed(() => {
    const activeEvent = this.event();
    if (!activeEvent) {
      return [];
    }

    const weekStart = this.startOfWeek(this.resolveAnchorDate(activeEvent));
    return this.weekDayLabels.map((label, dayIndex) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + dayIndex);
      return {
        dayIndex,
        label,
        dayNumber: date.getDate(),
        date: this.toDateString(date),
      };
    });
  });

  constructor() {
    effect(() => {
      const activeEvent = this.event();
      if (!this.open() || !activeEvent) {
        return;
      }

      this.form.reset(this.toFormValue(activeEvent), { emitEvent: false });
      this.selectedDay.set(this.resolveEventDay(activeEvent));
    });
  }

  protected close(): void {
    this.closeRequested.emit();
  }

  protected save(): void {
    const activeEvent = this.event();
    if (!activeEvent) {
      return;
    }

    const raw = this.form.getRawValue();
    const resolvedOriginalDay = this.resolveEventDay(activeEvent);
    const selectedDay = this.selectedDay() ?? resolvedOriginalDay;
    const selectedPill = this.weekDayPills().find((pill) => pill.dayIndex === selectedDay);
    const dayChanged = selectedDay !== resolvedOriginalDay;
    const timeChanged = raw.startTime !== activeEvent.startTime || raw.endTime !== activeEvent.endTime;

    const updatedEvent: CalendarEvent = {
      ...activeEvent,
      title: raw.title.trim() || activeEvent.title,
      startTime: raw.startTime,
      endTime: raw.endTime,
      day: selectedDay,
      date: selectedPill?.date ?? activeEvent.date,
    };

    if (activeEvent.type === 'shift') {
      updatedEvent.commuteMinutes = this.toOptionalNumber(raw.commuteMinutes);
    }

    if (activeEvent.type === 'workout') {
      updatedEvent.duration = this.toOptionalNumber(raw.duration);
      updatedEvent.distanceTarget = this.toOptionalNumber(raw.distanceTarget);
      updatedEvent.intensity = this.toOptionalChoice(raw.intensity);
      updatedEvent.priority = this.toOptionalChoice(raw.priority);
      updatedEvent.sessionType = this.toOptionalText(raw.sessionType);
      if (dayChanged || timeChanged) {
        updatedEvent.isManuallyPlaced = true;
      }
    }

    if (activeEvent.type === 'mealprep') {
      updatedEvent.duration = this.toOptionalNumber(raw.duration);
      if (dayChanged || timeChanged) {
        updatedEvent.isManuallyPlaced = true;
      }
    }

    const changes = this.diffEvent(activeEvent, updatedEvent);
    this.saveRequested.emit(updatedEvent);
  }

  protected chooseDay(dayIndex: number): void {
    this.selectedDay.set(dayIndex);
  }

  protected requestDelete(): void {
    const activeEvent = this.event();
    if (!activeEvent) {
      return;
    }

    this.deleteRequested.emit(activeEvent.id);
  }

  protected openInviteDialog(): void {
    this.inviteEmail.set('');
    this.inviteMessage.set('');
    this.inviteError.set(null);
    this.showInviteDialog.set(true);
  }

  protected closeInviteDialog(): void {
    this.showInviteDialog.set(false);
  }

  protected async submitInvite(): Promise<void> {
    const ev = this.event();
    const email = this.inviteEmail().trim();
    if (!ev || !email) return;

    this.inviteSending.set(true);
    this.inviteError.set(null);
    try {
      await this.dataStore.sendInvitation(ev.id, email);
      this.uiFeedback.show('Invitation sent');
      this.showInviteDialog.set(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send invitation';
      this.inviteError.set(msg);
    } finally {
      this.inviteSending.set(false);
    }
  }

  private toFormValue(event: CalendarEvent): EventFormValue {
    return {
      title: event.title,
      startTime: event.startTime,
      endTime: event.endTime,
      commuteMinutes: event.commuteMinutes?.toString() ?? '',
      duration: event.duration?.toString() ?? '',
      distanceTarget: event.distanceTarget?.toString() ?? '',
      intensity: event.intensity ?? '',
      priority: event.priority ?? '',
      sessionType: event.sessionType ?? '',
    };
  }

  private toOptionalNumber(value: string): number | undefined {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private toOptionalText(value: string): string | undefined {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  private toOptionalChoice<T extends string>(value: T | ''): T | undefined {
    return value || undefined;
  }

  private resolveEventDay(event: CalendarEvent): number {
    if (typeof event.day === 'number') {
      return event.day;
    }

    if (event.date) {
      return this.dayOfWeekIndex(event.date);
    }

    return this.dayOfWeekIndex(this.toDateString(new Date()));
  }

  private resolveAnchorDate(event: CalendarEvent): Date {
    if (event.date) {
      return new Date(`${event.date}T00:00:00`);
    }

    const today = new Date();
    const start = this.startOfWeek(today);
    start.setDate(start.getDate() + this.resolveEventDay(event));
    return start;
  }

  private dayOfWeekIndex(date: string): number {
    const parsed = new Date(`${date}T00:00:00`);
    return (parsed.getDay() + 6) % 7;
  }

  private startOfWeek(date: Date): Date {
    const copy = new Date(date);
    const day = copy.getDay();
    const diff = (day + 6) % 7;
    copy.setDate(copy.getDate() - diff);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  private toDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private diffEvent(original: CalendarEvent, updated: CalendarEvent): Partial<CalendarEvent> {
    const changes: Partial<Record<keyof CalendarEvent, CalendarEvent[keyof CalendarEvent]>> = {};

    (Object.keys(updated) as Array<keyof CalendarEvent>).forEach((key) => {
      if (updated[key] !== original[key]) {
        changes[key] = updated[key];
      }
    });

    return changes as Partial<CalendarEvent>;
  }
}