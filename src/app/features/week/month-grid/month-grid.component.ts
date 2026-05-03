import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { CalendarEvent, MonthDay } from '../../../mock-data';
import { workoutDisciplineBorderColor, workoutDisciplineBgColor } from '../../../shared/utils/discipline-colors.util';
import { DeleteWorkoutDialogComponent } from '../../../shared/delete-workout-dialog/delete-workout-dialog.component';
import { EventDetailModalComponent } from '../../../shared/event-detail-modal/event-detail-modal.component';
import { DataStoreService } from '../../../core/services/data-store.service';
import { getWorkoutDescription, WorkoutDescription } from '../../../core/utils/workout-descriptions';
import { UiFeedbackService } from '../../../shared/ui-feedback.service';

type MonthEventType = 'workout' | 'mealprep' | 'personal';

interface MonthEventLabel {
  type: MonthEventType;
  title: string;
}

interface DayChoice {
  index: number;
  shortLabel: string;
  dayNumber: string;
  date: string;
}

type BrickEvent = CalendarEvent & {
  discipline?: string | null;
  linkedNextSessionId?: string | null;
  linkedPriorSessionId?: string | null;
  prescriptionData?: Record<string, unknown> | null;
};

@Component({
  selector: 'app-month-grid',
  imports: [DeleteWorkoutDialogComponent, EventDetailModalComponent],
  templateUrl: './month-grid.component.html',
  styleUrl: './month-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonthGridComponent {
  readonly monthLabel = input.required<string>();
  readonly days = input.required<MonthDay[]>();
  readonly isCurrentMonth = input(false);
  readonly previousMonthRequested = output<void>();
  readonly nextMonthRequested = output<void>();
  readonly thisMonthRequested = output<void>();

  private readonly dataStore = inject(DataStoreService);
  private readonly uiFeedback = inject(UiFeedbackService);

  protected readonly weekDayLabels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  protected readonly selectedDate = signal<string | null>(null);
  protected readonly quickAddMode = signal(false);
  protected readonly quickAddType = signal<'shift' | 'workout' | 'personal' | 'mealprep' | null>(null);
  protected readonly isCreatingEvent = signal(false);
  protected readonly expandedEventIds = signal<string[]>([]);
  protected readonly editingEventId = signal<string | null>(null);
  protected readonly editingEventOpenTo = signal<'edit' | 'invite'>('edit');
  protected readonly editingEventDraft = signal<CalendarEvent | null>(null);
  protected readonly showSuggestedSlotHint = signal(false);
  protected readonly confirmingDeleteEventId = signal<string | null>(null);
  protected readonly workoutDeleteEventId = signal<string | null>(null);
  protected readonly findingBestTime = signal(false);
  protected readonly whyExpandedIds = signal<string[]>([]);

  protected readonly title = signal('');
  protected readonly startTime = signal('08:00');
  protected readonly endTime = signal('16:00');
  protected readonly commuteMinutes = signal(30);
  protected readonly workoutDuration = signal(45);
  protected readonly workoutIntensity = signal<'easy' | 'moderate' | 'hard'>('moderate');
  protected readonly workoutType = signal<'running' | 'biking' | 'strength' | 'yoga' | 'swimming'>('running');
  protected readonly mealprepDuration = signal(90);
  protected readonly selectedDayIndices = signal<number[]>([]);

  protected readonly weekDayChoices = computed<DayChoice[]>(() => {
    const selectedDate = this.selectedDate();
    if (!selectedDate) {
      return [];
    }

    const labels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    const anchor = this.startOfWeek(new Date(`${selectedDate}T00:00:00`));
    return labels.map((shortLabel, index) => {
      const date = this.toDateString(this.addDays(anchor, index));
      return {
        index,
        shortLabel,
        dayNumber: date.slice(-2),
        date,
      };
    });
  });

  protected readonly canSubmitQuickAdd = computed(() => this.selectedDayIndices().length > 0 && this.hasValidTimeRange());

  protected readonly selectedDatePreview = computed(() => {
    const selected = this.selectedDayIndices();
    if (selected.length === 0) {
      return '';
    }

    const firstDate = this.weekDayChoices().find((choice) => choice.index === selected[0])?.date;
    if (!firstDate) {
      return '';
    }

    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(new Date(`${firstDate}T00:00:00`));
  });

  protected readonly taskDerivedEventIds = computed(
    () =>
      new Set(
        this.dataStore
          .notes()
          .map((note) => note.linkedCalendarEventId)
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      ),
  );

  protected readonly selectedEvents = computed(() => {
    const date = this.selectedDate();
    if (!date) {
      return [];
    }

    return this.dataStore.eventsForDay(date);
  });

  protected readonly editingEvent = computed(
    () => this.editingEventDraft() ?? this.selectedEvents().find((event) => event.id === this.editingEventId()) ?? null,
  );

  protected readonly editorMode = computed<'edit' | 'create'>(() => (this.isCreatingEvent() ? 'create' : 'edit'));

  protected readonly workoutDeleteEvent = computed(
    () => this.selectedEvents().find((event) => event.id === this.workoutDeleteEventId()) ?? null,
  );

  protected readonly selectedDayLabel = computed(() => {
    const date = this.selectedDate();
    if (!date) {
      return '';
    }

    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    }).format(new Date(`${date}T00:00:00`));
  });

  protected previousMonth(): void {
    this.previousMonthRequested.emit();
  }

  protected nextMonth(): void {
    this.nextMonthRequested.emit();
  }

  protected jumpToThisMonth(): void {
    this.thisMonthRequested.emit();
  }

  protected openDay(day: MonthDay): void {
    this.selectedDate.set(day.date);
    this.quickAddMode.set(false);
    this.quickAddType.set(null);
    this.isCreatingEvent.set(false);
    this.selectedDayIndices.set([]);
    this.expandedEventIds.set([]);
    this.editingEventId.set(null);
    this.editingEventDraft.set(null);
    this.confirmingDeleteEventId.set(null);
    this.workoutDeleteEventId.set(null);
  }

  protected closeDaySheet(): void {
    this.selectedDate.set(null);
    this.quickAddMode.set(false);
    this.quickAddType.set(null);
    this.isCreatingEvent.set(false);
    this.selectedDayIndices.set([]);
    this.expandedEventIds.set([]);
    this.editingEventId.set(null);
    this.editingEventDraft.set(null);
    this.confirmingDeleteEventId.set(null);
    this.workoutDeleteEventId.set(null);
  }

  protected showQuickAddOptions(): void {
    this.quickAddMode.set(true);
    this.quickAddType.set(null);
    this.isCreatingEvent.set(false);
    this.selectedDayIndices.set([this.selectedDayIndex()]);
  }

  protected toggleEvent(event: CalendarEvent): void {
    this.expandedEventIds.update((current) =>
      current.includes(event.id) ? current.filter((id) => id !== event.id) : [...current, event.id],
    );
  }

  protected isExpanded(event: CalendarEvent): boolean {
    return this.expandedEventIds().includes(event.id);
  }

  protected openEvent(event: CalendarEvent): void {
    const date = this.selectedDate();
    if (!date) {
      return;
    }
  }

  protected openEditor(event: CalendarEvent): void {
    this.confirmingDeleteEventId.set(null);
    this.workoutDeleteEventId.set(null);
    this.isCreatingEvent.set(false);
    this.editingEventDraft.set(null);
    this.showSuggestedSlotHint.set(false);
    this.editingEventOpenTo.set('edit');
    this.editingEventId.set(event.id);
  }

  protected openEditorForInvite(event: CalendarEvent): void {
    this.confirmingDeleteEventId.set(null);
    this.workoutDeleteEventId.set(null);
    this.isCreatingEvent.set(false);
    this.editingEventDraft.set(null);
    this.showSuggestedSlotHint.set(false);
    this.editingEventOpenTo.set('invite');
    this.editingEventId.set(event.id);
  }

  protected closeEditor(): void {
    this.isCreatingEvent.set(false);
    this.editingEventDraft.set(null);
    this.showSuggestedSlotHint.set(false);
    this.editingEventOpenTo.set('edit');
    this.editingEventId.set(null);
  }

  protected async saveEvent(updatedEvent: CalendarEvent): Promise<void> {
    if (this.isCreatingEvent()) {
      await this.dataStore.addCalendarEvent(this.toCreatePayload(updatedEvent));
    } else {
      await this.dataStore.updateCalendarEvent(updatedEvent.id, updatedEvent);
    }

    this.isCreatingEvent.set(false);
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
    const activeEvent = this.selectedEvents().find((event) => event.id === eventId);
    if (!activeEvent) {
      return;
    }

    this.requestDelete(activeEvent);
  }

  protected cancelDelete(): void {
    this.confirmingDeleteEventId.set(null);
  }

  protected async deleteFromModal(eventId: string): Promise<void> {
    await this.dataStore.deleteCalendarEvent(eventId);
    this.expandedEventIds.update((current) => current.filter((id) => id !== eventId));
    this.confirmingDeleteEventId.set(null);
    this.editingEventId.set(null);
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

  protected chooseQuickAdd(type: 'shift' | 'workout' | 'personal' | 'mealprep'): void {
    this.quickAddType.set(type);
    this.isCreatingEvent.set(true);
    this.showSuggestedSlotHint.set(false);
    this.editingEventOpenTo.set('edit');
    this.editingEventId.set(null);
    this.editingEventDraft.set(this.buildDraftEvent(type));
    this.quickAddMode.set(false);
    this.selectedDayIndices.set([this.selectedDayIndex()]);
  }

  protected toggleQuickAddDay(dayIndex: number): void {
    const type = this.quickAddType();
    if (!type) {
      return;
    }

    if (type === 'shift') {
      this.selectedDayIndices.update((current) =>
        current.includes(dayIndex)
          ? current.filter((day) => day !== dayIndex)
          : [...current, dayIndex].sort((a, b) => a - b),
      );
      return;
    }

    this.selectedDayIndices.set([dayIndex]);
  }

  protected async submitQuickAdd(): Promise<void> {
    const type = this.quickAddType();
    const selectedDays = this.selectedDayIndices();
    if (!type || selectedDays.length === 0) {
      return;
    }

    const choices = this.weekDayChoices();
    const selectedChoices = [...selectedDays]
      .sort((a, b) => a - b)
      .map((dayIndex) => choices.find((choice) => choice.index === dayIndex))
      .filter((choice): choice is DayChoice => !!choice);

    if (selectedChoices.length === 0) {
      return;
    }

    const common: Omit<Partial<CalendarEvent>, 'day' | 'date'> = {
      title: this.title().trim() || this.defaultTitle(type),
      startTime: this.startTime(),
      endTime: this.endTime(),
    };

    if (type === 'shift') {
      for (const choice of selectedChoices) {
        await this.dataStore.addCalendarEvent({
          ...common,
          type: 'shift',
          isManuallyPlaced: true,
          commuteMinutes: this.commuteMinutes(),
          day: choice.index,
          date: choice.date,
        });
      }
    } else if (type === 'workout') {
      const choice = selectedChoices[0];
      await this.dataStore.addCalendarEvent({
        ...common,
        type: 'workout',
        isManuallyPlaced: true,
        duration: this.workoutDuration(),
        durationMinutes: this.workoutDuration(),
        intensity: this.workoutIntensity(),
        sessionType: this.workoutType(),
        day: choice.index,
        date: choice.date,
      });
    } else if (type === 'personal') {
      const choice = selectedChoices[0];
      await this.dataStore.addCalendarEvent({
        ...common,
        type: 'custom-event',
        isManuallyPlaced: true,
        isPersonal: true,
        day: choice.index,
        date: choice.date,
      });
    } else {
      const choice = selectedChoices[0];
      await this.dataStore.addCalendarEvent({
        ...common,
        type: 'mealprep',
        isManuallyPlaced: true,
        duration: this.mealprepDuration(),
        durationMinutes: this.mealprepDuration(),
        day: choice.index,
        date: choice.date,
      });
    }

    this.quickAddMode.set(false);
    this.quickAddType.set(null);
  }

  protected closeQuickAddOptions(): void {
    this.quickAddMode.set(false);
    this.quickAddType.set(null);
    this.isCreatingEvent.set(false);
    this.selectedDayIndices.set([]);
  }

  protected eventTypeLabel(event: CalendarEvent): string {
    switch (event.type) {
      case 'workout':
        return 'Workout';
      case 'shift':
        return 'Shift';
      case 'mealprep':
        return 'Meal Prep';
      case 'personal':
      case 'custom-event':
        return 'Personal';
      case 'oncall':
        return 'On Call';
      default:
        return 'Event';
    }
  }

  protected eventTypeColor(event: CalendarEvent): string {
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
      default:
        return 'var(--color-border)';
    }
  }

  protected isBrickLinked(event: CalendarEvent): boolean {
    if (event.type !== 'workout') {
      return false;
    }

    return this.hasBrickPriorInSelected(event) || this.hasBrickNextInSelected(event);
  }

  protected hasBrickPriorInSelected(event: CalendarEvent): boolean {
    const priorId = this.brickPriorId(event);
    return !!priorId && this.selectedEvents().some((candidate) => candidate.id === priorId);
  }

  protected hasBrickNextInSelected(event: CalendarEvent): boolean {
    const nextId = this.brickNextId(event);
    return !!nextId && this.selectedEvents().some((candidate) => candidate.id === nextId);
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

  protected intensityLabel(event: CalendarEvent): string {
    if (!event.intensity) {
      return '';
    }

    return event.intensity.charAt(0).toUpperCase() + event.intensity.slice(1);
  }

  protected priorityLabel(event: CalendarEvent): string {
    switch (event.priority) {
      case 'key':
        return 'Key';
      case 'optional':
        return 'Optional';
      case 'supporting':
      default:
        return 'Supporting';
    }
  }

  protected durationLabel(event: CalendarEvent): string {
    const duration = event.duration ?? this.durationFromTimes(event.startTime, event.endTime);
    if (duration % 60 === 0) {
      const hours = duration / 60;
      return `${hours}h`;
    }

    return `${duration} min`;
  }

  protected hasExpandedDetails(event: CalendarEvent): boolean {
    return event.type === 'workout' || event.type === 'shift' || event.type === 'mealprep' || event.type === 'personal' || event.type === 'custom-event';
  }

  protected workoutDescription(event: CalendarEvent): WorkoutDescription | null {
    if (event.type !== 'workout') {
      return null;
    }

    const plan = this.dataStore.currentPlan();
    const date = event.date ?? this.selectedDate();
    const weekMeta = date ? this.findWeekMeta(date) : null;
    const fromTimes = this.durationFromTimes(event.startTime, event.endTime);
    const durationMinutes = fromTimes > 0 ? fromTimes : (event.duration ?? 0);

    return getWorkoutDescription(
      event.sessionType ?? event.title,
      weekMeta?.phase ?? 'base',
      weekMeta?.weekNumber ?? 1,
      plan?.mode ?? 'race',
      plan?.sportType ?? null,
      durationMinutes,
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

  protected intensityColor(event: CalendarEvent): string {
    if (event.intensity === 'easy') {
      return 'var(--color-success)';
    }
    if (event.intensity === 'moderate') {
      return 'var(--color-warning)';
    }
    return 'var(--color-error)';
  }

  protected async markDone(event: CalendarEvent): Promise<void> {
    await this.dataStore.updateCalendarEvent(event.id, { status: 'completed' });
  }

  protected async skipEvent(event: CalendarEvent): Promise<void> {
    await this.dataStore.updateCalendarEvent(event.id, { status: 'skipped' });
  }

  protected shareEvent(event: CalendarEvent): void {
    this.openEditorForInvite(event);
  }

  protected isInviteable(event: CalendarEvent): boolean {
    return event.type === 'workout' || event.type === 'custom-event' || event.type === 'personal';
  }

  protected dayEventLabels(day: MonthDay): MonthEventLabel[] {
    const labels: MonthEventLabel[] = [];
    const dayEvents = this.dataStore.eventsForDay(day.date);

    const workoutEvents = dayEvents.filter((event) => event.type === 'workout');
    const personalEvents = dayEvents.filter((event) => event.type === 'custom-event' || event.type === 'personal');
    const hasMealPrep = dayEvents.some((event) => event.type === 'mealprep');

    if (workoutEvents.length > 0) {
      for (const workoutEvent of workoutEvents) {
        labels.push({ type: 'workout', title: this.displayTitleForEvent(workoutEvent) });
      }
    }

    if (hasMealPrep) {
      labels.push({ type: 'mealprep', title: 'Meal Prep' });
    }

    if (personalEvents.length > 0) {
      for (const personalEvent of personalEvents) {
        labels.push({ type: 'personal', title: this.displayTitleForEvent(personalEvent) });
      }
    }

    return labels;
  }

  protected visibleLabels(day: MonthDay): MonthEventLabel[] {
    return this.dayEventLabels(day).slice(0, 2);
  }

  protected hiddenLabelCount(day: MonthDay): number {
    return Math.max(this.dayEventLabels(day).length - 2, 0);
  }

  protected eventBorderColor(type: MonthEventType, sessionType?: string): string {
    switch (type) {
      case 'workout':
        return workoutDisciplineBorderColor(sessionType);
      case 'mealprep':
        return 'var(--color-mealprep)';
      case 'personal':
        return 'var(--color-personal)';
      default:
        return 'var(--color-border)';
    }
  }

  protected eventBackground(type: MonthEventType, sessionType?: string): string {
    switch (type) {
      case 'workout':
        return workoutDisciplineBgColor(sessionType);
      case 'mealprep':
        return 'rgba(107, 127, 94, 0.10)';
      case 'personal':
        return 'rgba(184, 112, 75, 0.10)';
      default:
        return 'rgba(232, 229, 224, 0.3)';
    }
  }

  protected displayTitleForEvent(event: CalendarEvent): string {
    const title = this.baseEventTitle(event);
    if (this.isTaskDerivedEvent(event)) {
      return `[Task] ${title}`;
    }
    return title;
  }

  private baseEventTitle(event: CalendarEvent): string {
    const title = event.title?.trim();

    if (event.type === 'personal' || event.type === 'custom-event') {
      return title && title.length > 0 ? title : 'Personal';
    }

    return title && title.length > 0 ? title : 'Event';
  }

  private isTaskDerivedEvent(event: CalendarEvent): boolean {
    if (this.taskDerivedEventIds().has(event.id)) {
      return true;
    }

    return (event.type === 'personal' || event.type === 'custom-event')
      && event.isPersonal === true
      && event.isManuallyPlaced === false;
  }

  private durationFromTimes(startTime: string, endTime: string): number {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    return endHours * 60 + endMinutes - (startHours * 60 + startMinutes);
  }

  private defaultTitle(type: 'shift' | 'workout' | 'personal' | 'mealprep'): string {
    if (type === 'shift') {
      return 'Work Shift';
    }
    if (type === 'workout') {
      return 'Workout';
    }
    if (type === 'personal') {
      return 'Personal Event';
    }
    return 'Meal Prep';
  }

  private buildDraftEvent(type: 'shift' | 'workout' | 'personal' | 'mealprep'): CalendarEvent {
    const date = this.selectedDate() ?? this.toDateString(new Date());
    const base: CalendarEvent = {
      id: `new-${type}-${Date.now()}`,
      title: this.defaultTitle(type),
      type: 'custom-event',
      day: this.dayOfWeekIndex(date),
      date,
      startTime: type === 'workout' ? '17:00' : type === 'mealprep' ? '18:00' : '08:00',
      endTime: type === 'workout' ? '17:45' : type === 'mealprep' ? '19:30' : '16:00',
      isManuallyPlaced: true,
    };

    if (type === 'shift') {
      return {
        ...base,
        type: 'shift',
        title: 'Work Shift',
        commuteMinutes: 30,
      };
    }

    if (type === 'workout') {
      return {
        ...base,
        type: 'workout',
        title: 'Workout',
        duration: 45,
        durationMinutes: 45,
        intensity: 'moderate',
        priority: 'supporting',
        sessionType: 'running',
      };
    }

    if (type === 'mealprep') {
      return {
        ...base,
        type: 'mealprep',
        title: 'Meal Prep',
        duration: 90,
        durationMinutes: 90,
      };
    }

    return {
      ...base,
      type: 'custom-event',
      title: 'Personal Event',
      isPersonal: true,
    };
  }

  private toCreatePayload(event: CalendarEvent): Partial<CalendarEvent> {
    const { id, ...payload } = event;
    return payload;
  }

  private dayOfWeekIndex(date: string): number {
    const parsed = new Date(`${date}T00:00:00`);
    return (parsed.getDay() + 6) % 7;
  }

  private selectedDayIndex(): number {
    const date = this.selectedDate();
    if (!date) {
      return 0;
    }

    return (new Date(`${date}T00:00:00`).getDay() + 6) % 7;
  }

  private addDays(start: Date, days: number): Date {
    const result = new Date(start);
    result.setDate(result.getDate() + days);
    return result;
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

  private findWeekMeta(date: string): { phase: string; weekNumber: number } | null {
    const target = new Date(`${date}T00:00:00`);
    if (Number.isNaN(target.getTime())) {
      return null;
    }

    for (const week of this.dataStore.planWeeks()) {
      const start = new Date(`${week.startDate}T00:00:00`);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      if (target >= start && target <= end) {
        return {
          phase: week.phase,
          weekNumber: week.weekNumber,
        };
      }
    }

    return null;
  }

  private hasValidTimeRange(): boolean {
    const startMinutes = this.timeToMinutes(this.startTime());
    const endMinutes = this.timeToMinutes(this.endTime());
    return startMinutes !== null && endMinutes !== null && endMinutes > startMinutes;
  }

  private timeToMinutes(time: string): number | null {
    if (!/^\d{2}:\d{2}$/.test(time)) {
      return null;
    }

    const [hours, minutes] = time.split(':').map(Number);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return null;
    }

    return hours * 60 + minutes;
  }

  private finishWorkoutDelete(eventId: string): void {
    this.workoutDeleteEventId.set(null);
    this.confirmingDeleteEventId.set(null);
    this.editingEventId.set(null);
    this.expandedEventIds.update((current) => current.filter((id) => id !== eventId));
  }

  private brickNextId(event: CalendarEvent): string | null {
    const value = (event as BrickEvent).linkedNextSessionId;
    return typeof value === 'string' && value.length > 0 ? value : null;
  }

  private brickPriorId(event: CalendarEvent): string | null {
    const value = (event as BrickEvent).linkedPriorSessionId;
    return typeof value === 'string' && value.length > 0 ? value : null;
  }
}
