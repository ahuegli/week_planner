import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DataStoreService } from '../../../core/services/data-store.service';
import { IHaveTimeSuggestion } from '../../../core/models/app-data.models';
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

  protected readonly hasSuggestion = computed(() => {
    const suggestion = this.suggestion();
    return !!suggestion && suggestion.kind !== 'none';
  });

  protected open(): void {
    this.isOpen.set(true);
    this.suggestion.set(this.dataStore.getIHaveTimeSuggestion(this.resolveTargetDate()));
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

      this.close();
    } finally {
      this.isApplying.set(false);
    }
  }

  protected askCoach(): void {
    console.log('[WeekPlanner] Ask my coach tapped — chatbot not yet connected');
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
