import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CalendarEvent } from '../../../mock-data';
import { PlanMode, PlannedSession } from '../../../core/models/app-data.models';
import { workoutDisciplineBorderColor } from '../../../shared/utils/discipline-colors.util';
import { DataStoreService } from '../../../core/services/data-store.service';
import { getWorkoutDescription } from '../../../core/utils/workout-descriptions';
import { DeleteWorkoutDialogComponent } from '../../../shared/delete-workout-dialog/delete-workout-dialog.component';
import { EventDetailModalComponent } from '../../../shared/event-detail-modal/event-detail-modal.component';
import { UiFeedbackService } from '../../../shared/ui-feedback.service';

type BrickEvent = CalendarEvent & {
  discipline?: string | null;
  linkedNextSessionId?: string | null;
  linkedPriorSessionId?: string | null;
  prescriptionData?: Record<string, unknown> | null;
};

const TYPE_COLORS: Record<CalendarEvent['type'], string> = {
  shift: 'var(--color-shift)',
  workout: 'var(--color-workout)',
  mealprep: 'var(--color-mealprep)',
  'custom-event': 'var(--color-personal)',
  personal: 'var(--color-personal)',
  oncall: 'var(--color-oncall)',
  busy: 'rgba(139, 129, 120, 0.5)',
};
// workout bar color is overridden per discipline in barColor computed below

@Component({
  selector: 'app-event-card',
  imports: [DeleteWorkoutDialogComponent, EventDetailModalComponent],
  standalone: true,
  templateUrl: './event-card.component.html',
  styleUrl: './event-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventCardComponent {
  private readonly dataStore = inject(DataStoreService);
  private readonly uiFeedback = inject(UiFeedbackService);
  private readonly router = inject(Router);

  readonly event = input.required<CalendarEvent>();
  readonly isPast = input<boolean>(false);
  readonly expanded = input(false);
  readonly phase = input<string>('base');
  readonly weekNumber = input<number>(1);
  readonly planMode = input<PlanMode>('race');
  readonly sportType = input<string | null>(null);
  readonly toggleRequested = output<void>();

  protected readonly isEditorOpen = signal(false);
  protected readonly editingEventDraft = signal<CalendarEvent | null>(null);
  protected readonly showSuggestedSlotHint = signal(false);
  protected readonly showDeleteConfirm = signal(false);
  protected readonly showWorkoutDeleteDialog = signal(false);
  protected readonly findingBestTime = signal(false);
  protected readonly isWhyExpanded = signal(false);

  protected readonly displayEvent = computed<CalendarEvent>(() => this.event());

  protected readonly effectiveStatus = computed(() => this.displayEvent().status);

  protected readonly barColor = computed(() => {
    const e = this.displayEvent();
    if (e.type === 'workout') return workoutDisciplineBorderColor(e.sessionType);
    return TYPE_COLORS[e.type];
  });

  protected readonly brickLinked = computed(() => {
    const event = this.displayEvent();
    return this.hasBrickPrior(event) || this.hasBrickNext(event);
  });

  protected readonly offBikeRun = computed(() => {
    const event = this.displayEvent();
    if (event.type !== 'workout') {
      return false;
    }

    const brick = event as BrickEvent;
    const isRunDiscipline = brick.discipline === 'run';
    const isOffBike = (brick.prescriptionData?.['isOffBike'] as boolean | undefined) === true;
    return isRunDiscipline && (isOffBike || this.hasBrickPrior(event));
  });

  protected readonly isDimmed = computed(
    () =>
      this.isPast() ||
      this.effectiveStatus() === 'completed' ||
      this.effectiveStatus() === 'skipped',
  );

  protected readonly showCheckIn = computed(() => this.displayEvent().type === 'workout');

  protected readonly durationHours = computed(() => {
    const e = this.displayEvent();
    const [sh, sm] = e.startTime.split(':').map(Number);
    const [eh, em] = e.endTime.split(':').map(Number);
    return (eh * 60 + em - (sh * 60 + sm)) / 60;
  });

  protected readonly detailsText = computed(() => {
    const e = this.displayEvent();
    switch (e.type) {
      case 'shift': {
        const h = this.durationHours();
        const hrs = h === Math.floor(h) ? `${h}h` : `${h.toFixed(1)}h`;
        const commute = e.commuteMinutes ? ` · ${e.commuteMinutes} min commute` : '';
        return `${hrs}${commute}`;
      }
      case 'workout': {
        const parts: string[] = [];
        if (e.duration) parts.push(`${e.duration} min`);
        if (e.distanceTarget) parts.push(`${e.distanceTarget} km`);
        if (e.intensity) {
          parts.push(e.intensity.charAt(0).toUpperCase() + e.intensity.slice(1));
        }
        return parts.join(' · ');
      }
      case 'mealprep':
        return e.duration ? `${e.duration} min` : '';
      default:
        return '';
    }
  });

  protected readonly canExpand = computed(
    () => this.displayEvent().type === 'workout' || this.displayEvent().type === 'shift' || this.displayEvent().type === 'mealprep',
  );

  protected readonly coachingNote = computed(() => {
    const e = this.displayEvent();
    if (e.type !== 'workout') {
      return null;
    }

    return getWorkoutDescription(
      e.sessionType ?? e.title,
      this.phase(),
      this.weekNumber(),
      this.planMode(),
      this.sportType(),
    );
  });

  protected readonly intensityLabel = computed(() => {
    const intensity = this.displayEvent().intensity;
    if (!intensity) {
      return '';
    }
    return intensity.charAt(0).toUpperCase() + intensity.slice(1);
  });

  protected async setStatus(status: NonNullable<CalendarEvent['status']>): Promise<void> {
    const activeEvent = this.displayEvent();

    if (activeEvent.type !== 'workout') {
      await this.dataStore.updateCalendarEvent(activeEvent.id, { status });
      return;
    }

    if (status === 'completed') {
      await this.markWorkoutDone(activeEvent);
      return;
    }

    if (status === 'skipped') {
      await this.skipWorkoutFromExpandedCard(activeEvent);
      return;
    }

    await this.dataStore.updateCalendarEvent(activeEvent.id, { status });
  }

  protected toggleWhy(): void {
    this.isWhyExpanded.update((value) => !value);
  }

  protected openEditor(): void {
    this.showDeleteConfirm.set(false);
    this.showWorkoutDeleteDialog.set(false);
    this.isEditorOpen.set(true);
  }

  protected closeEditor(): void {
    this.editingEventDraft.set(null);
    this.showSuggestedSlotHint.set(false);
    this.isEditorOpen.set(false);
  }

  protected async saveEvent(updatedEvent: CalendarEvent): Promise<void> {
    await this.dataStore.updateCalendarEvent(updatedEvent.id, updatedEvent);
    this.editingEventDraft.set(null);
    this.showSuggestedSlotHint.set(false);
    this.isEditorOpen.set(false);
  }

  protected requestDelete(): void {
    this.isEditorOpen.set(false);
    if (this.displayEvent().type === 'workout') {
      this.showDeleteConfirm.set(false);
      this.showWorkoutDeleteDialog.set(true);
      return;
    }

    this.showDeleteConfirm.set(true);
  }

  protected handleEditorDelete(): void {
    this.requestDelete();
  }

  protected cancelDelete(): void {
    this.showDeleteConfirm.set(false);
  }

  protected async confirmDelete(): Promise<void> {
    await this.dataStore.deleteCalendarEvent(this.displayEvent().id);
    this.showDeleteConfirm.set(false);

    if (this.expanded()) {
      this.toggleRequested.emit();
    }
  }

  protected closeWorkoutDeleteDialog(): void {
    this.showWorkoutDeleteDialog.set(false);
  }

  protected async rescheduleWorkout(event: CalendarEvent): Promise<void> {
    this.findingBestTime.set(true);

    const storedEvent = this.dataStore.calendarEvents().find((candidate) => candidate.id === event.id);
    const originalEvent = { ...(storedEvent ?? {}), ...event } as CalendarEvent;
    const startedAt = Date.now();
    const suggestedEvent = await this.dataStore.suggestWorkoutRescheduleSlot(originalEvent);
    const remainingDelayMs = 1200 - (Date.now() - startedAt);
    if (remainingDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, remainingDelayMs));
    }

    const draftEvent: CalendarEvent = suggestedEvent
      ? {
          ...originalEvent,
          day: suggestedEvent.day,
          date: suggestedEvent.date,
          startTime: suggestedEvent.startTime,
          endTime: suggestedEvent.endTime,
        }
      : originalEvent;

    this.showWorkoutDeleteDialog.set(false);
    this.editingEventDraft.set(draftEvent);
    this.showSuggestedSlotHint.set(!!suggestedEvent);
    this.isEditorOpen.set(true);
    this.findingBestTime.set(false);
  }

  protected async skipWorkout(): Promise<void> {
    const activeEvent = this.displayEvent();
    this.showWorkoutDeleteDialog.set(false);
    const result = await this.dataStore.deleteWorkoutEventAndSkipLinkedSession(activeEvent.id);
    if (!result.success) {
      return;
    }

    this.isEditorOpen.set(false);

    if (this.expanded()) {
      this.toggleRequested.emit();
    }
  }

  protected async removeWorkoutFromPlan(): Promise<void> {
    const activeEvent = this.displayEvent();
    this.showWorkoutDeleteDialog.set(false);
    const result = await this.dataStore.deleteWorkoutEventAndSkipLinkedSession(activeEvent.id);
    if (!result.success) {
      return;
    }

    this.isEditorOpen.set(false);

    if (this.expanded()) {
      this.toggleRequested.emit();
    }

    this.uiFeedback.show('Session removed');
  }

  private async markWorkoutDone(event: CalendarEvent): Promise<void> {
    const linkedSession = this.findLinkedPlannedSession(event);

    if (linkedSession) {
      const completed = await this.dataStore.completeSession(linkedSession.id, 'moderate');
      if (!completed) {
        return;
      }
    }

    await this.dataStore.updateCalendarEvent(event.id, { status: 'completed' });
  }

  private async skipWorkoutFromExpandedCard(event: CalendarEvent): Promise<void> {
    const result = await this.dataStore.deleteWorkoutEventAndSkipLinkedSession(event.id);
    if (!result.success) {
      return;
    }

    this.isEditorOpen.set(false);
    if (this.expanded()) {
      this.toggleRequested.emit();
    }
  }

  private findLinkedPlannedSession(event: CalendarEvent): PlannedSession | null {
    const directlyLinked = this.dataStore.findPlannedSessionByEventId(event.id);
    if (directlyLinked) {
      return directlyLinked;
    }

    const currentPlan = this.dataStore.currentPlan();
    const targetWeek = currentPlan?.weeks?.find((week) => week.weekNumber === this.weekNumber());
    const sessions = targetWeek?.sessions ?? [];
    const targetSessionType = this.normalizeSessionType(event.sessionType ?? event.title);

    const bestMatch = sessions.find(
      (session) =>
        this.normalizeSessionType(session.sessionType) === targetSessionType &&
        (session.status === 'pending' || session.status === 'scheduled'),
    );

    if (bestMatch) {
      return bestMatch;
    }

    return sessions.find((session) => this.normalizeSessionType(session.sessionType) === targetSessionType) ?? null;
  }

  protected navigateToWorkout(): void {
    const id = this.displayEvent().id;
    this.router.navigate(['/workout', id]);
  }

  private normalizeSessionType(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, '_');
  }

  private hasBrickNext(event: CalendarEvent): boolean {
    if (event.type !== 'workout') {
      return false;
    }

    const nextId = (event as BrickEvent).linkedNextSessionId;
    return typeof nextId === 'string' && nextId.length > 0;
  }

  private hasBrickPrior(event: CalendarEvent): boolean {
    if (event.type !== 'workout') {
      return false;
    }

    const priorId = (event as BrickEvent).linkedPriorSessionId;
    return typeof priorId === 'string' && priorId.length > 0;
  }

  private static readonly BUBBLE_COLORS = ['#2d4d7a', '#6B7F5E', '#A85454', '#C4923A', '#5a7a8a'];

  protected inviteeBubbles(): string[] {
    return (this.displayEvent().acceptedInviteeEmails ?? []).slice(0, 3);
  }

  protected inviteeOverflow(): number {
    return Math.max((this.displayEvent().acceptedInviteeEmails?.length ?? 0) - 3, 0);
  }

  protected bubbleColor(email: string): string {
    const hash = [...email].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return EventCardComponent.BUBBLE_COLORS[hash % EventCardComponent.BUBBLE_COLORS.length];
  }
}
