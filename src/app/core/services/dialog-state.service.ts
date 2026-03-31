import { Injectable, effect, signal } from '@angular/core';
import { CalendarEvent } from '../models/calendar-event.model';
import { Workout } from '../models/workout.model';

export interface QuickAddTargetContext {
  day: number;
  weekOffset: number;
  label: string;
  date: Date;
}

type QuickAddType = 'work' | 'workout' | 'personal' | 'mealprep';

@Injectable({
  providedIn: 'root',
})
export class DialogStateService {
  // Quick add dialogs
  readonly showWorkoutCard = signal(false);
  readonly showWorkShiftCard = signal(false);
  readonly showPersonalEventCard = signal(false);
  readonly showMealPrepCard = signal(false);
  readonly quickAddTarget = signal<QuickAddTargetContext | null>(null);

  // Settings dialog
  readonly showSettingsDialog = signal(false);

  // Event detail modal
  readonly selectedEvent = signal<CalendarEvent | null>(null);
  readonly showEventModal = signal(false);

  // Workout template editor
  readonly selectedWorkoutTemplate = signal<Workout | null>(null);

  // Fill dialog
  readonly showFillDialog = signal(false);

  constructor() {
    // Manage body overflow when dialogs are open
    effect(() => {
      const anyDialogOpen =
        this.showSettingsDialog() ||
        this.showEventModal() ||
        this.showFillDialog() ||
        this.showWorkoutCard() ||
        this.showWorkShiftCard() ||
        this.showPersonalEventCard() ||
        this.showMealPrepCard() ||
        this.selectedWorkoutTemplate();

      document.body.style.overflow = anyDialogOpen ? 'hidden' : '';
    });
  }

  // Settings dialog
  openSettings(): void {
    this.showSettingsDialog.set(true);
  }

  closeSettings(): void {
    this.showSettingsDialog.set(false);
  }

  // Event modal
  openEventModal(event: CalendarEvent): void {
    this.selectedEvent.set(event);
    this.showEventModal.set(true);
  }

  closeEventModal(): void {
    this.showEventModal.set(false);
    this.selectedEvent.set(null);
  }

  // Workout template editor
  openWorkoutTemplateEditor(workout: Workout): void {
    this.selectedWorkoutTemplate.set(workout);
  }

  closeWorkoutTemplateEditor(): void {
    this.selectedWorkoutTemplate.set(null);
  }

  // Fill dialog
  openFillDialog(): void {
    this.showFillDialog.set(true);
  }

  closeFillDialog(): void {
    this.showFillDialog.set(false);
  }

  // Quick add dialogs
  openWorkShiftDialog(target: QuickAddTargetContext | null = null): void {
    this.setActiveQuickAddDialog('work', target);
  }

  closeWorkShiftDialog(): void {
    this.showWorkShiftCard.set(false);
    this.clearQuickAddTargetIfIdle();
  }

  openWorkoutDialog(target: QuickAddTargetContext | null = null): void {
    this.setActiveQuickAddDialog('workout', target);
  }

  closeWorkoutDialog(): void {
    this.showWorkoutCard.set(false);
    this.clearQuickAddTargetIfIdle();
  }

  openPersonalEventDialog(target: QuickAddTargetContext | null = null): void {
    this.setActiveQuickAddDialog('personal', target);
  }

  closePersonalEventDialog(): void {
    this.showPersonalEventCard.set(false);
    this.clearQuickAddTargetIfIdle();
  }

  openMealPrepDialog(target: QuickAddTargetContext | null = null): void {
    this.setActiveQuickAddDialog('mealprep', target);
  }

  closeMealPrepDialog(): void {
    this.showMealPrepCard.set(false);
    this.clearQuickAddTargetIfIdle();
  }

  private setActiveQuickAddDialog(kind: QuickAddType, target: QuickAddTargetContext | null): void {
    this.showWorkShiftCard.set(kind === 'work');
    this.showWorkoutCard.set(kind === 'workout');
    this.showPersonalEventCard.set(kind === 'personal');
    this.showMealPrepCard.set(kind === 'mealprep');
    this.quickAddTarget.set(target);
  }

  private clearQuickAddTargetIfIdle(): void {
    if (
      !this.showWorkShiftCard() &&
      !this.showWorkoutCard() &&
      !this.showPersonalEventCard() &&
      !this.showMealPrepCard()
    ) {
      this.quickAddTarget.set(null);
    }
  }
}
