import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DataStoreService } from '../../../core/services/data-store.service';
import { IHaveTimeSuggestion, Note } from '../../../core/models/app-data.models';
import { UiFeedbackService } from '../../../shared/ui-feedback.service';

@Component({
  selector: 'app-i-have-time',
  standalone: true,
  templateUrl: './i-have-time.component.html',
  styleUrl: './i-have-time.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IHaveTimeComponent {
  private readonly dataStore = inject(DataStoreService);
  private readonly router = inject(Router);
  private readonly uiFeedback = inject(UiFeedbackService);

  readonly selectedDate = input<string>('');

  protected readonly isOpen = signal(false);
  protected readonly isApplying = signal(false);
  protected readonly suggestion = signal<IHaveTimeSuggestion | null>(null);
  private readonly skippedNoteIds = signal<Set<string>>(new Set());

  protected readonly hasSuggestion = computed(() => {
    const suggestion = this.suggestion();
    return !!suggestion && suggestion.kind !== 'none';
  });

  protected open(): void {
    this.isOpen.set(true);
    this.skippedNoteIds.set(new Set());
    const planSuggestion = this.dataStore.getIHaveTimeSuggestion(this.resolveTargetDate());

    if (planSuggestion.kind === 'none' || planSuggestion.kind === 'no-plan') {
      const taskSuggestion = this.buildTaskSuggestion();
      this.suggestion.set(taskSuggestion.kind !== 'none' ? taskSuggestion : planSuggestion);
    } else {
      this.suggestion.set(planSuggestion);
    }
  }

  protected close(): void {
    this.isOpen.set(false);
    this.isApplying.set(false);
  }

  protected async accept(): Promise<void> {
    const suggestion = this.suggestion();
    if (!suggestion || this.isApplying()) {
      return;
    }

    if (suggestion.kind === 'no-plan') {
      this.close();
      await this.router.navigate(['/onboarding']);
      return;
    }

    this.isApplying.set(true);

    try {
      const now = new Date();
      const startTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const targetDate = this.resolveTargetDate();
      const day = (new Date(`${targetDate}T00:00:00`).getDay() + 6) % 7;

      if ((suggestion.kind === 'pending' || suggestion.kind === 'tomorrow') && suggestion.plannedSessionId) {
        const updated = await this.dataStore.scheduleSessionNow(suggestion.plannedSessionId, targetDate, startTime);
        if (updated) {
          this.close();
          if (updated.linkedCalendarEventId) {
            await this.router.navigate(['/workout', updated.linkedCalendarEventId]);
          } else {
            this.uiFeedback.show(`${suggestion.sessionType ?? 'Session'} added to today`);
          }
        }
        return;
      }

      if (suggestion.kind === 'mealprep') {
        const duration = suggestion.duration ?? 90;
        const endTime = this.addMinutes(startTime, duration);

        if (suggestion.eventId) {
          await this.dataStore.updateCalendarEvent(suggestion.eventId, {
            day,
            date: targetDate,
            startTime,
            endTime,
            duration,
            durationMinutes: duration,
            isManuallyPlaced: true,
          });
        } else {
          await this.dataStore.addCalendarEvent({
            title: 'Meal Prep',
            type: 'mealprep',
            day,
            date: targetDate,
            startTime,
            endTime,
            duration,
            durationMinutes: duration,
            isManuallyPlaced: true,
          });
        }

        this.uiFeedback.show('Meal prep added to today');
        this.close();
        return;
      }

      if (suggestion.kind === 'recovery') {
        const duration = suggestion.duration ?? 20;
        const endTime = this.addMinutes(startTime, duration);
        const created = await this.dataStore.addCalendarEvent({
          title: suggestion.sessionType ?? 'Yoga & Mobility',
          type: 'workout',
          day,
          date: targetDate,
          startTime,
          endTime,
          duration,
          durationMinutes: duration,
          intensity: suggestion.intensity ?? 'easy',
          sessionType: 'mobility',
          priority: 'optional',
          isManuallyPlaced: true,
        });
        this.close();
        if (created) {
          await this.router.navigate(['/workout', created.id]);
        } else {
          this.uiFeedback.show('Recovery session added to today');
        }
        return;
      }

      if (suggestion.kind === 'task' && suggestion.noteId) {
        const note = this.dataStore.notes().find((n) => n.id === suggestion.noteId);
        if (!note) {
          this.close();
          return;
        }

        const duration = note.estimatedDurationMinutes ?? 30;
        const endTime = this.addMinutes(startTime, duration);
        const created = await this.dataStore.addCalendarEvent({
          title: note.title,
          type: 'custom-event',
          day,
          date: targetDate,
          startTime,
          endTime,
          duration,
          durationMinutes: duration,
          isManuallyPlaced: true,
        });

        if (created) {
          await this.dataStore.updateNote(note.id, { linkedCalendarEventId: created.id });
          this.uiFeedback.show(`"${note.title}" added to your day`);
          this.close();
        } else {
          this.uiFeedback.show('No open slot available right now.', 3000);
          this.isApplying.set(false);
        }
        return;
      }

      this.close();
    } finally {
      this.isApplying.set(false);
    }
  }

  protected skipTask(): void {
    const current = this.suggestion();
    if (!current || current.kind !== 'task' || !current.noteId) {
      this.close();
      return;
    }

    this.skippedNoteIds.update((s) => new Set([...s, current.noteId!]));
    this.suggestion.set(this.buildTaskSuggestion());
  }

  protected askCoach(): void {
    void this.router.navigate(['/coach']);
  }

  private buildTaskSuggestion(): IHaveTimeSuggestion {
    const skipped = this.skippedNoteIds();

    const schedulable = this.dataStore.notes().filter(
      (n) =>
        n.noteType === 'task' &&
        !n.completed &&
        !skipped.has(n.id) &&
        !n.linkedCalendarEventId,
    );

    if (schedulable.length === 0) {
      return { kind: 'none', message: "You're all caught up! Enjoy your rest.", ctaLabel: null };
    }

    const withDuration = schedulable.filter(
      (n) => typeof n.estimatedDurationMinutes === 'number' && n.estimatedDurationMinutes > 0,
    );

    if (withDuration.length === 0) {
      return {
        kind: 'none',
        message: "You have tasks but none have an estimated duration. Add a duration to enable suggestions.",
        ctaLabel: null,
      };
    }

    const sorted = [...withDuration].sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      const durDiff = (b.estimatedDurationMinutes ?? 0) - (a.estimatedDurationMinutes ?? 0);
      if (durDiff !== 0) return durDiff;
      return a.title.localeCompare(b.title);
    });

    const note = sorted[0];
    const hasMore = sorted.length > 1;

    return {
      kind: 'task',
      noteId: note.id,
      message: hasMore
        ? `Here's a task that fits the time you have.`
        : `Here's a task you could do right now.`,
      ctaLabel: 'Schedule it now',
      sessionType: note.title,
      duration: note.estimatedDurationMinutes ?? undefined,
      description: note.body ?? note.description ?? undefined,
    };
  }

  private addMinutes(startTime: string, durationMinutes: number): string {
    const [hoursText, minutesText] = startTime.split(':');
    const total = Number(hoursText) * 60 + Number(minutesText) + durationMinutes;
    const normalized = ((total % (24 * 60)) + (24 * 60)) % (24 * 60);
    const hours = Math.floor(normalized / 60);
    const minutes = normalized % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  private resolveTargetDate(): string {
    const inputDate = this.selectedDate();
    if (inputDate) {
      return inputDate;
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

