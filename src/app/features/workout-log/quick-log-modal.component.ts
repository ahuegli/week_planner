import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { DataStoreService } from '../../core/services/data-store.service';
import { UiFeedbackService } from '../../shared/ui-feedback.service';
import { CreateWorkoutLogPayload, EnergyRating, UpdateWorkoutLogPayload, WorkoutLog } from '../../core/models/app-data.models';
import { generateIcsForLog } from '../../shared/utils/ics-generator.util';

const SESSION_TYPES: { value: string; label: string }[] = [
  { value: 'running', label: 'Running' },
  { value: 'cycling', label: 'Cycling' },
  { value: 'swimming', label: 'Swimming' },
  { value: 'strength', label: 'Strength' },
  { value: 'yoga_mobility', label: 'Yoga / Mobility' },
  { value: 'pilates', label: 'Pilates' },
  { value: 'hiit', label: 'HIIT / Cross-training' },
  { value: 'walking_hiking', label: 'Walking / Hiking' },
  { value: 'other', label: 'Other' },
];

const DISTANCE_TYPES = new Set(['running', 'cycling', 'swimming']);

@Component({
  selector: 'app-quick-log-modal',
  standalone: true,
  imports: [],
  templateUrl: './quick-log-modal.component.html',
  styleUrl: './quick-log-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickLogModalComponent {
  private readonly dataStore = inject(DataStoreService);
  private readonly uiFeedback = inject(UiFeedbackService);

  readonly open = input<boolean>(false);
  readonly logToEdit = input<WorkoutLog | null>(null);
  readonly closeRequested = output<void>();
  readonly logSaved = output<WorkoutLog>();
  readonly logUpdated = output<WorkoutLog>();
  readonly logDeleted = output<string>();

  protected readonly sessionTypes = SESSION_TYPES;

  protected readonly activityType = signal<string>('running');
  protected readonly durationStr = signal<string>('');
  protected readonly titleStr = signal<string>('');
  protected readonly distanceStr = signal<string>('');
  protected readonly energyRating = signal<EnergyRating | null>(null);
  protected readonly notesStr = signal<string>('');
  protected readonly completedAtStr = signal<string>(this.nowLocalDateTime());
  protected readonly isSaving = signal<boolean>(false);
  private readonly hydratedLogId = signal<string | null>(null);

  protected readonly isEditMode = computed(() => !!this.logToEdit());
  protected readonly modalTitle = computed(() => (this.isEditMode() ? 'Edit logged workout' : 'Log a workout'));
  protected readonly saveLabel = computed(() => (this.isEditMode() ? 'Save changes' : 'Save workout'));
  protected readonly canExport = computed(() => !!this.logToEdit());

  protected readonly showDistance = computed(() => DISTANCE_TYPES.has(this.activityType()));

  protected readonly canSubmit = computed(() => {
    const dur = parseInt(this.durationStr(), 10);
    return this.activityType().length > 0 && !isNaN(dur) && dur > 0 && !this.isSaving();
  });

  constructor() {
    effect(() => {
      if (!this.open()) {
        this.hydratedLogId.set(null);
        return;
      }

      const log = this.logToEdit();
      if (!log) {
        if (this.hydratedLogId() !== 'create') {
          this.resetForm();
          this.hydratedLogId.set('create');
        }
        return;
      }

      if (this.hydratedLogId() === log.id) {
        return;
      }

      this.populateFromLog(log);
      this.hydratedLogId.set(log.id);
    });
  }

  protected setActivity(value: string): void {
    this.activityType.set(value);
    if (!DISTANCE_TYPES.has(value)) {
      this.distanceStr.set('');
    }
  }

  protected setEnergy(rating: EnergyRating): void {
    this.energyRating.set(this.energyRating() === rating ? null : rating);
  }

  protected async save(): Promise<void> {
    if (!this.canSubmit()) return;

    this.isSaving.set(true);
    try {
      const dur = parseInt(this.durationStr(), 10);
      const dist = parseFloat(this.distanceStr());
      const title = this.titleStr().trim();
      const notes = this.notesStr().trim();
      const rating = this.energyRating();

      const editingLog = this.logToEdit();
      if (editingLog) {
        const payload: UpdateWorkoutLogPayload = {
          actualDuration: dur,
          ...(this.showDistance() && !isNaN(dist) && dist > 0 && { actualDistance: dist }),
          ...(rating ? { energyRating: rating } : { energyRating: undefined }),
          notes: notes || undefined,
        };

        const updated = await this.dataStore.updateWorkoutLog(editingLog.id, payload);
        this.uiFeedback.show('Workout updated');
        this.logUpdated.emit(updated);
      } else {
        const payload: CreateWorkoutLogPayload = {
          sessionType: this.activityType(),
          actualDuration: dur,
          completedAt: this.completedAtISO(),
          ...(title && { title }),
          ...(this.showDistance() && !isNaN(dist) && dist > 0 && { actualDistance: dist }),
          ...(rating && { energyRating: rating }),
          ...(notes && { notes }),
        };

        const log = await this.dataStore.logUnlinkedWorkout(payload);
        this.uiFeedback.show('Workout logged');
        this.logSaved.emit(log);
      }

      this.resetForm();
      this.closeRequested.emit();
    } catch (err) {
      console.error('[QuickLogModal] Save failed', err);
    } finally {
      this.isSaving.set(false);
    }
  }

  protected close(): void {
    this.resetForm();
    this.closeRequested.emit();
  }

  protected async deleteLog(): Promise<void> {
    const log = this.logToEdit();
    if (!log || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    try {
      await this.dataStore.deleteWorkoutLog(log.id);
      this.uiFeedback.show('Workout deleted');
      this.logDeleted.emit(log.id);
      this.resetForm();
      this.closeRequested.emit();
    } catch (err) {
      console.error('[QuickLogModal] Delete failed', err);
    } finally {
      this.isSaving.set(false);
    }
  }

  protected exportCalendarDownload(): void {
    const log = this.logToEdit();
    if (!log) {
      return;
    }

    const content = generateIcsForLog(log);
    const filename = this.buildIcsFilename(log);
    this.downloadIcsFile(content, filename);
    this.uiFeedback.show('Calendar file downloaded');
  }

  protected async exportCalendarCopy(): Promise<void> {
    const log = this.logToEdit();
    if (!log) {
      return;
    }

    const copied = await this.copyToClipboard(generateIcsForLog(log));
    this.uiFeedback.show(copied ? 'Calendar text copied' : 'Could not copy calendar text');
  }

  private resetForm(): void {
    this.activityType.set('running');
    this.durationStr.set('');
    this.titleStr.set('');
    this.distanceStr.set('');
    this.energyRating.set(null);
    this.notesStr.set('');
    this.completedAtStr.set(this.nowLocalDateTime());
    this.hydratedLogId.set(null);
  }

  private populateFromLog(log: WorkoutLog): void {
    this.activityType.set(log.sessionType || 'running');
    this.durationStr.set(log.actualDuration ? String(log.actualDuration) : '');
    this.titleStr.set(log.title ?? '');
    this.distanceStr.set(log.actualDistance ? String(log.actualDistance) : '');
    this.energyRating.set(log.energyRating ?? null);
    this.notesStr.set(log.notes ?? '');

    const completed = new Date(log.completedAt);
    const offset = completed.getTimezoneOffset();
    const local = new Date(completed.getTime() - offset * 60000);
    this.completedAtStr.set(local.toISOString().slice(0, 16));
  }

  private nowLocalDateTime(): string {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  }

  private completedAtISO(): string {
    const val = this.completedAtStr();
    if (!val) return new Date().toISOString();
    return new Date(val).toISOString();
  }

  private buildIcsFilename(log: WorkoutLog): string {
    const baseTitle = (log.title?.trim() || log.sessionType || 'workout')
      .replace(/\s+/g, '_')
      .replace(/[\\/:*?"<>|]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '') || 'workout';

    const date = new Date(log.completedAt);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const datePart = Number.isNaN(date.getTime()) ? 'unknown-date' : `${year}-${month}-${day}`;

    return `${baseTitle}_${datePart}.ics`;
  }

  private downloadIcsFile(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  private async copyToClipboard(content: string): Promise<boolean> {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(content);
        return true;
      } catch {
        return false;
      }
    }

    return false;
  }
}
