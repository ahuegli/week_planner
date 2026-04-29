import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { CalendarEvent, DaySchedule } from '../../../mock-data';
import { PlanMode } from '../../../core/models/app-data.models';
import { workoutDisciplineBorderColor, workoutDisciplineBgColor } from '../../../shared/utils/discipline-colors.util';
import { DataStoreService } from '../../../core/services/data-store.service';
import { getWorkoutDescription, WorkoutDescription } from '../../../core/utils/workout-descriptions';
import { DeleteWorkoutDialogComponent } from '../../../shared/delete-workout-dialog/delete-workout-dialog.component';
import { EventDetailModalComponent } from '../../../shared/event-detail-modal/event-detail-modal.component';
import { UiFeedbackService } from '../../../shared/ui-feedback.service';

interface GroupedEvents {
  label: 'AM' | 'PM';
  events: CalendarEvent[];
}

type BrickEvent = CalendarEvent & {
  discipline?: string | null;
  linkedNextSessionId?: string | null;
  linkedPriorSessionId?: string | null;
  prescriptionData?: Record<string, unknown> | null;
};

@Component({
  selector: 'app-day-row',
  imports: [DeleteWorkoutDialogComponent, EventDetailModalComponent],
  templateUrl: './day-row.component.html',
  styleUrl: './day-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DayRowComponent {
  private readonly dataStore = inject(DataStoreService);
  private readonly uiFeedback = inject(UiFeedbackService);

  readonly day = input.required<DaySchedule>();
  readonly expandedEventId = input<string | null>(null);
  readonly phase = input<string>('base');
  readonly weekNumber = input<number>(1);
  readonly planMode = input<PlanMode>('race');
  readonly sportType = input<string | null>(null);
  readonly conflictingEventIds = input<Set<string>>(new Set());
  readonly eventToggle = output<string>();
  readonly eventUpdated = output<CalendarEvent>();
  readonly eventDeleted = output<string>();

  protected readonly editingEventId = signal<string | null>(null);
  protected readonly editingEventDraft = signal<CalendarEvent | null>(null);
  protected readonly showSuggestedSlotHint = signal(false);
  protected readonly confirmingDeleteEventId = signal<string | null>(null);
  protected readonly workoutDeleteEventId = signal<string | null>(null);
  protected readonly findingBestTime = signal(false);
  protected readonly whyExpandedIds = signal<string[]>([]);

  protected readonly visibleEvents = computed(() => this.day().events);

  protected readonly editingEvent = computed(
    () => this.editingEventDraft() ?? this.visibleEvents().find((event) => event.id === this.editingEventId()) ?? null,
  );

  protected readonly workoutDeleteEvent = computed(
    () => this.visibleEvents().find((event) => event.id === this.workoutDeleteEventId()) ?? null,
  );

  protected readonly groupedEvents = computed<GroupedEvents[]>(() => {
    const am: CalendarEvent[] = [];
    const pm: CalendarEvent[] = [];

    for (const event of this.visibleEvents()) {
      const hour = Number(event.startTime.split(':')[0] ?? 0);
      if (hour < 12) {
        am.push(event);
      } else {
        pm.push(event);
      }
    }

    const groups: GroupedEvents[] = [];
    if (am.length > 0) {
      groups.push({ label: 'AM', events: am });
    }
    if (pm.length > 0) {
      groups.push({ label: 'PM', events: pm });
    }
    return groups;
  });

  protected readonly isFreeDay = computed(() =>
    !this.visibleEvents().some((event) => event.type === 'shift' || event.type === 'busy'),
  );

  protected eventColor(event: CalendarEvent): string {
    switch (event.type) {
      case 'workout':
        return workoutDisciplineBorderColor(event.sessionType);
      case 'shift':
        return 'var(--color-shift)';
      case 'mealprep':
        return 'var(--color-mealprep)';
      case 'personal':
      case 'custom-event':
        return 'var(--color-personal)';
      case 'oncall':
        return 'var(--color-oncall)';
      case 'busy':
        return 'rgba(139, 129, 120, 0.5)';
      default:
        return 'var(--color-border)';
    }
  }

  protected eventBg(event: CalendarEvent): string {
    switch (event.type) {
      case 'workout':
        return workoutDisciplineBgColor(event.sessionType);
      case 'shift':
        return 'rgba(139, 129, 120, 0.15)';
      case 'mealprep':
        return 'rgba(107, 127, 94, 0.15)';
      case 'personal':
      case 'custom-event':
        return 'rgba(184, 112, 75, 0.15)';
      case 'oncall':
        return 'rgba(196, 146, 58, 0.15)';
      case 'busy':
        return 'rgba(139, 129, 120, 0.08)';
      default:
        return 'rgba(232, 229, 224, 0.4)';
    }
  }

  protected intensityColor(event: CalendarEvent): string {
    switch (event.intensity) {
      case 'easy':
        return 'var(--color-success)';
      case 'moderate':
        return 'var(--color-warning)';
      case 'hard':
        return 'var(--color-error)';
      default:
        return 'transparent';
    }
  }

  protected isExpanded(event: CalendarEvent): boolean {
    return this.expandedEventId() === event.id;
  }

  private static readonly BUBBLE_COLORS = ['#2d4d7a', '#6B7F5E', '#A85454', '#C4923A', '#5a7a8a'];

  protected inviteeBubbles(event: CalendarEvent): string[] {
    return (event.acceptedInviteeEmails ?? []).slice(0, 3);
  }

  protected inviteeOverflow(event: CalendarEvent): number {
    return Math.max((event.acceptedInviteeEmails?.length ?? 0) - 3, 0);
  }

  protected bubbleColor(email: string): string {
    const hash = [...email].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return DayRowComponent.BUBBLE_COLORS[hash % DayRowComponent.BUBBLE_COLORS.length];
  }

  protected navigateToDay(): void {
  }

  protected onEventTap(event: CalendarEvent): void {
    this.eventToggle.emit(event.id);
  }

  protected sessionTypeLabel(event: CalendarEvent): string {
    const sessionType = event.sessionType ?? event.title.toLowerCase().replace(/\s+/g, '_');
    const map: Record<string, string> = {
      tempo: 'Tempo Run',
      long_run: 'Long Run',
      strength: 'Strength Training',
      easy_run: 'Easy Run',
      yoga: 'Yoga & Mobility',
      intervals: 'Intervals',
      hill_reps: 'Hill Reps',
      biking: 'Long Bike Ride',
    };

    return map[sessionType] ?? event.title;
  }

  protected priorityLabel(event: CalendarEvent): string {
    switch (event.priority) {
      case 'key':
        return 'Key session';
      case 'optional':
        return 'Optional';
      case 'supporting':
      default:
        return 'Supporting';
    }
  }

  protected workoutDescription(event: CalendarEvent): WorkoutDescription | null {
    if (event.type !== 'workout') {
      return null;
    }

    const sessionType = event.sessionType ?? event.title;
    return getWorkoutDescription(
      sessionType,
      this.phase(),
      this.weekNumber(),
      this.planMode(),
      this.sportType(),
    );
  }

  protected toggleWhy(eventId: string): void {
    this.whyExpandedIds.update((current) =>
      current.includes(eventId) ? current.filter((id) => id !== eventId) : [...current, eventId],
    );
  }

  protected isWhyExpanded(eventId: string): boolean {
    return this.whyExpandedIds().includes(eventId);
  }

  protected hasExpandedDetails(event: CalendarEvent): boolean {
    return (
      event.type === 'workout' ||
      event.type === 'shift' ||
      event.type === 'personal' ||
      event.type === 'custom-event' ||
      event.type === 'mealprep'
    );
  }

  protected durationLabel(event: CalendarEvent): string {
    const duration = event.duration ?? this.durationFromTimes(event.startTime, event.endTime);
    if (duration % 60 === 0) {
      const hours = duration / 60;
      return `${hours} hour${hours === 1 ? '' : 's'}`;
    }

    return `${duration} min`;
  }

  protected intensityLabel(event: CalendarEvent): string {
    if (!event.intensity) {
      return '';
    }

    return event.intensity.charAt(0).toUpperCase() + event.intensity.slice(1);
  }

  protected shouldShowActionButtons(event: CalendarEvent): boolean {
    return event.type === 'workout' && (event.status === 'scheduled' || event.status === 'pending');
  }

  protected shouldShowCompletedLabel(event: CalendarEvent): boolean {
    return event.type === 'workout' && event.status === 'completed';
  }

  protected shouldShowSkippedState(event: CalendarEvent): boolean {
    return event.type === 'workout' && event.status === 'skipped';
  }

  protected isBrickLinked(event: CalendarEvent, events: CalendarEvent[]): boolean {
    if (event.type !== 'workout') {
      return false;
    }

    return this.hasBrickPriorInList(event, events) || this.hasBrickNextInList(event, events);
  }

  protected hasBrickPriorInList(event: CalendarEvent, events: CalendarEvent[]): boolean {
    const priorId = this.brickPriorId(event);
    return !!priorId && events.some((candidate) => candidate.id === priorId);
  }

  protected hasBrickNextInList(event: CalendarEvent, events: CalendarEvent[]): boolean {
    const nextId = this.brickNextId(event);
    return !!nextId && events.some((candidate) => candidate.id === nextId);
  }

  protected isOffBikeRun(event: CalendarEvent): boolean {
    if (event.type !== 'workout') {
      return false;
    }

    const brick = event as BrickEvent;
    const isRunDiscipline = brick.discipline === 'run';
    const isOffBike = (brick.prescriptionData?.['isOffBike'] as boolean | undefined) === true;
    return isRunDiscipline && (isOffBike || !!this.brickPriorId(event));
  }

  private brickNextId(event: CalendarEvent): string | null {
    const value = (event as BrickEvent).linkedNextSessionId;
    return typeof value === 'string' && value.length > 0 ? value : null;
  }

  private brickPriorId(event: CalendarEvent): string | null {
    const value = (event as BrickEvent).linkedPriorSessionId;
    return typeof value === 'string' && value.length > 0 ? value : null;
  }

  protected openEditor(event: CalendarEvent): void {
    this.confirmingDeleteEventId.set(null);
    this.workoutDeleteEventId.set(null);
    this.editingEventDraft.set(null);
    this.showSuggestedSlotHint.set(false);
    this.editingEventId.set(event.id);
  }

  protected closeEditor(): void {
    this.editingEventDraft.set(null);
    this.showSuggestedSlotHint.set(false);
    this.editingEventId.set(null);
  }

  protected saveEvent(updatedEvent: CalendarEvent): void {
    this.eventUpdated.emit(updatedEvent);
    this.editingEventDraft.set(null);
    this.showSuggestedSlotHint.set(false);
    this.editingEventId.set(null);
  }

  protected requestDelete(event: CalendarEvent): void {
    this.editingEventId.set(null);
    if (event.type === 'workout') {
      this.confirmingDeleteEventId.set(null);
      this.workoutDeleteEventId.set(event.id);
      return;
    }

    this.confirmingDeleteEventId.set(event.id);
  }

  protected handleEditorDelete(eventId: string): void {
    const activeEvent = this.visibleEvents().find((event) => event.id === eventId);
    if (!activeEvent) {
      return;
    }

    this.requestDelete(activeEvent);
  }

  protected cancelDelete(): void {
    this.confirmingDeleteEventId.set(null);
  }

  protected deleteFromModal(eventId: string): void {
    this.eventDeleted.emit(eventId);
    this.confirmingDeleteEventId.set(null);
    this.editingEventId.set(null);

    if (this.expandedEventId() === eventId) {
      this.eventToggle.emit(eventId);
    }
  }

  protected closeWorkoutDeleteDialog(): void {
    this.workoutDeleteEventId.set(null);
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

    this.workoutDeleteEventId.set(null);
    this.editingEventDraft.set(draftEvent);
    this.showSuggestedSlotHint.set(!!suggestedEvent);
    this.editingEventId.set(event.id);
    this.findingBestTime.set(false);
  }

  protected async skipWorkout(event: CalendarEvent): Promise<void> {
    this.workoutDeleteEventId.set(null);
    const result = await this.dataStore.deleteWorkoutEventAndSkipLinkedSession(event.id);
    if (!result.success) {
      return;
    }

    this.finishWorkoutDelete(event.id);
  }

  protected async removeWorkoutFromPlan(event: CalendarEvent): Promise<void> {
    this.workoutDeleteEventId.set(null);
    const result = await this.dataStore.deleteWorkoutEventAndSkipLinkedSession(event.id);
    if (!result.success) {
      return;
    }

    this.finishWorkoutDelete(event.id);
    this.uiFeedback.show('Session removed');
  }

  protected deletePrompt(event: CalendarEvent): string {
    if (event.type === 'shift' && event.isRepeatingWeekly) {
      return 'Delete all occurrences of this repeating shift?';
    }

    return 'Delete this event?';
  }

  protected deleteButtonLabel(event: CalendarEvent): string {
    if (event.type === 'shift' && event.isRepeatingWeekly) {
      return 'Delete all occurrences';
    }

    return 'Delete';
  }

  protected markDone(event: CalendarEvent): void {
    this.eventUpdated.emit({ ...event, status: 'completed' });
  }

  protected async skipEvent(event: CalendarEvent): Promise<void> {
    if (event.type !== 'workout') {
      this.eventUpdated.emit({ ...event, status: 'skipped' });
      return;
    }

    const result = await this.dataStore.deleteWorkoutEventAndSkipLinkedSession(event.id);
    if (!result.success) {
      return;
    }

    this.finishWorkoutDelete(event.id);
  }

  protected undoSkip(event: CalendarEvent): void {
    this.eventUpdated.emit({ ...event, status: 'scheduled' });
  }

  private toDisplayTime(time24: string): string {
    const [hoursText, minutesText] = time24.split(':');
    const hours = Number(hoursText);
    const minutes = Number(minutesText);
    const suffix = hours >= 12 ? 'pm' : 'am';
    const hour12 = ((hours + 11) % 12) + 1;
    const minute = String(minutes).padStart(2, '0');
    return `${hour12}:${minute}${suffix}`;
  }

  private durationFromTimes(startTime: string, endTime: string): number {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    return endHours * 60 + endMinutes - (startHours * 60 + startMinutes);
  }

  private finishWorkoutDelete(eventId: string): void {
    this.workoutDeleteEventId.set(null);
    this.confirmingDeleteEventId.set(null);
    this.editingEventId.set(null);

    if (this.expandedEventId() === eventId) {
      this.eventToggle.emit(eventId);
    }
  }
}
