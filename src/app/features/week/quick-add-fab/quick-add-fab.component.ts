import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { CalendarEvent } from '../../../mock-data';
import { EventDetailModalComponent } from '../../../shared/event-detail-modal/event-detail-modal.component';

@Component({
  selector: 'app-quick-add-fab',
  imports: [EventDetailModalComponent],
  templateUrl: './quick-add-fab.component.html',
  styleUrl: './quick-add-fab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickAddFabComponent {
  readonly weekStartDate = input.required<string>();
  readonly eventCreated = output<Partial<CalendarEvent>[]>();

  protected readonly isOpen = signal(false);
  protected readonly activeType = signal<'shift' | 'workout' | 'personal' | 'mealprep' | null>(null);
  protected readonly modalOpen = signal(false);
  protected readonly draftEvent = signal<CalendarEvent | null>(null);

  protected openSheet(): void {
    this.isOpen.set(true);
    this.activeType.set(null);
  }

  protected closeSheet(): void {
    this.isOpen.set(false);
    this.activeType.set(null);
  }

  protected choose(type: 'shift' | 'workout' | 'personal' | 'mealprep'): void {
    this.activeType.set(type);
    this.isOpen.set(false);
    this.draftEvent.set(this.buildDraftEvent(type));
    this.modalOpen.set(true);
  }

  protected onModalClose(): void {
    this.modalOpen.set(false);
    this.draftEvent.set(null);
    this.activeType.set(null);
  }

  protected onModalSave(updatedEvent: CalendarEvent): void {
    const payload = this.toCreatePayload(updatedEvent);
    this.eventCreated.emit([payload]);
    this.modalOpen.set(false);
    this.draftEvent.set(null);
    this.activeType.set(null);
  }

  private buildDraftEvent(type: 'shift' | 'workout' | 'personal' | 'mealprep'): CalendarEvent {
    const date = this.defaultDateForWeek();
    const day = this.dayOfWeekIndex(date);

    const base: CalendarEvent = {
      id: `new-${type}-${Date.now()}`,
      title: this.defaultTitle(type),
      type: 'custom-event',
      day,
      date,
      startTime: type === 'workout' ? '17:00' : type === 'mealprep' ? '18:00' : '08:00',
      endTime: type === 'workout' ? '17:45' : type === 'mealprep' ? '19:30' : '16:00',
      isManuallyPlaced: true,
    };

    if (type === 'shift') {
      return { ...base, type: 'shift', title: 'Work Shift', commuteMinutes: 30 };
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
      return { ...base, type: 'mealprep', title: 'Meal Prep', duration: 90, durationMinutes: 90 };
    }

    return { ...base, type: 'custom-event', title: 'Personal Event', isPersonal: true };
  }

  private toCreatePayload(event: CalendarEvent): Partial<CalendarEvent> {
    const { id, ...payload } = event;
    return payload;
  }

  private defaultTitle(type: 'shift' | 'workout' | 'personal' | 'mealprep'): string {
    if (type === 'shift') return 'Work Shift';
    if (type === 'workout') return 'Workout';
    if (type === 'personal') return 'Personal Event';
    return 'Meal Prep';
  }

  /** Returns today's date string if today falls in the displayed week, otherwise Monday of that week. */
  private defaultDateForWeek(): string {
    const today = this.toDateString(new Date());
    const weekStart = this.weekStartDate();
    const weekEnd = this.addDays(weekStart, 6);
    if (today >= weekStart && today <= weekEnd) {
      return today;
    }
    return weekStart;
  }

  private dayOfWeekIndex(date: string): number {
    return (new Date(`${date}T00:00:00`).getDay() + 6) % 7;
  }

  private toDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private addDays(start: string, days: number): string {
    const base = new Date(`${start}T00:00:00`);
    base.setDate(base.getDate() + days);
    return this.toDateString(base);
  }
}
