import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { CalendarEvent } from '../../../mock-data';

interface DayChoice {
  index: number;
  shortLabel: string;
  dayNumber: string;
  date: string;
}

@Component({
  selector: 'app-quick-add-fab',
  imports: [],
  templateUrl: './quick-add-fab.component.html',
  styleUrl: './quick-add-fab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickAddFabComponent {
  readonly weekStartDate = input.required<string>();
  readonly eventCreated = output<Partial<CalendarEvent>[]>();

  protected readonly isOpen = signal(false);
  protected readonly activeType = signal<'shift' | 'workout' | 'personal' | 'mealprep' | null>(null);

  protected readonly title = signal('');
  protected readonly startTime = signal('08:00');
  protected readonly endTime = signal('16:00');
  protected readonly selectedDays = signal<number[]>([]);
  protected readonly commuteMinutes = signal(30);
  protected readonly repeatsWeekly = signal(true);
  protected readonly workoutDuration = signal(45);
  protected readonly workoutIntensity = signal<'easy' | 'moderate' | 'hard'>('moderate');
  protected readonly workoutType = signal<'running' | 'biking' | 'strength' | 'yoga' | 'swimming'>('running');
  protected readonly mealprepDuration = signal(90);
  protected readonly dayChoices = computed<DayChoice[]>(() => {
    const labels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    return labels.map((shortLabel, index) => {
      const date = this.addDays(this.weekStartDate(), index);
      return {
        index,
        shortLabel,
        dayNumber: date.slice(-2),
        date,
      };
    });
  });

  protected readonly selectedDatePreview = computed(() => {
    const selected = this.selectedDays();
    if (selected.length === 0) {
      return '';
    }

    const firstDate = this.dayChoices().find((choice) => choice.index === selected[0])?.date;
    if (!firstDate) {
      return '';
    }

    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(new Date(`${firstDate}T00:00:00`));
  });

  protected readonly canSubmit = computed(() => this.selectedDays().length > 0 && this.hasValidTimeRange());

  protected openSheet(): void {
    this.isOpen.set(true);
    this.activeType.set(null);
    this.selectedDays.set([]);
  }

  protected closeSheet(): void {
    this.isOpen.set(false);
    this.activeType.set(null);
    this.selectedDays.set([]);
  }

  protected choose(type: 'shift' | 'workout' | 'personal' | 'mealprep'): void {
    this.activeType.set(type);
    this.title.set(this.defaultTitle(type));
    this.startTime.set(type === 'workout' ? '17:00' : type === 'mealprep' ? '18:00' : '08:00');
    this.endTime.set(type === 'workout' ? '17:45' : type === 'mealprep' ? '19:30' : '16:00');
    this.repeatsWeekly.set(type === 'shift');
    this.selectedDays.set([]);
  }

  protected toggleDay(dayIndex: number): void {
    const type = this.activeType();
    if (!type) {
      return;
    }

    if (type === 'shift') {
      this.selectedDays.update((current) =>
        current.includes(dayIndex) ? current.filter((day) => day !== dayIndex) : [...current, dayIndex].sort((a, b) => a - b),
      );
      return;
    }

    this.selectedDays.set([dayIndex]);
  }

  protected submit(): void {
    const type = this.activeType();
    if (!type) {
      return;
    }

    const selectedDays = this.selectedDays();
    if (selectedDays.length === 0) {
      return;
    }

    const sortedDays = [...selectedDays].sort((a, b) => a - b);
    const common: Omit<Partial<CalendarEvent>, 'day' | 'date'> = {
      title: this.title().trim() || this.defaultTitle(type),
      startTime: this.startTime(),
      endTime: this.endTime(),
    };

    const events = sortedDays.map((day) => ({
      ...common,
      day,
      date: this.addDays(this.weekStartDate(), day),
    }));

    if (type === 'shift') {
      this.eventCreated.emit(
        events.map((event) => ({
          ...event,
          type: 'shift',
          isManuallyPlaced: true,
          commuteMinutes: this.commuteMinutes(),
          isRepeatingWeekly: this.repeatsWeekly(),
        })),
      );
    } else if (type === 'workout') {
      const event = events[0];
      this.eventCreated.emit([
        {
          ...event,
          type: 'workout',
          isManuallyPlaced: true,
          duration: this.workoutDuration(),
          durationMinutes: this.workoutDuration(),
          intensity: this.workoutIntensity(),
          sessionType: this.workoutType(),
        },
      ]);
    } else if (type === 'personal') {
      const event = events[0];
      this.eventCreated.emit([
        {
          ...event,
          type: 'custom-event',
          isManuallyPlaced: true,
          isPersonal: true,
        },
      ]);
    } else {
      const event = events[0];
      this.eventCreated.emit([
        {
          ...event,
          type: 'mealprep',
          isManuallyPlaced: true,
          duration: this.mealprepDuration(),
          durationMinutes: this.mealprepDuration(),
        },
      ]);
    }

    this.closeSheet();
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

  private addDays(start: string, days: number): string {
    const base = new Date(`${start}T00:00:00`);
    base.setDate(base.getDate() + days);
    const year = base.getFullYear();
    const month = String(base.getMonth() + 1).padStart(2, '0');
    const day = String(base.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
}
