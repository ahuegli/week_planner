import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SlotPickerDialogComponent } from '../components/slot-picker-dialog/slot-picker-dialog.component';
import { CalendarEvent, Note, SlotCandidate } from '../core/models/app-data.models';
import { DataStoreService } from '../core/services/data-store.service';
import { SlotSuggestionService } from '../core/services/slot-suggestion.service';
import { UiFeedbackService } from '../shared/ui-feedback.service';

@Component({
  selector: 'app-notes-page',
  standalone: true,
  imports: [SlotPickerDialogComponent],
  template: `
    <section class="page-wrap">
      <header class="page-header">
        <h1 class="page-title">Notes</h1>
      </header>

      <article class="card add-card">
        @if (!formExpanded()) {
          <button type="button" class="add-row" (click)="expandForm()">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span class="add-placeholder">New note...</span>
          </button>
        } @else {
          <div class="form-body">
            <input
              class="field title-field"
              type="text"
              placeholder="Note title"
              [value]="newTitle()"
              (input)="newTitle.set($any($event.target).value)"
            />
            <textarea
              class="field body-field"
              placeholder="Details (optional)"
              [value]="newBody()"
              (input)="newBody.set($any($event.target).value)"
              rows="3"
            ></textarea>
            <div class="field-row">
              <div class="field-group">
                <label class="field-label">Due date</label>
                <input
                  class="field"
                  type="date"
                  [value]="newDueDate()"
                  (input)="newDueDate.set($any($event.target).value)"
                />
              </div>
              <div class="field-group">
                <label class="field-label">Time</label>
                <input
                  class="field"
                  type="time"
                  [value]="newDueTime()"
                  (input)="newDueTime.set($any($event.target).value)"
                />
              </div>
            </div>
            <div class="field-group">
              <label class="field-label">Estimated duration (min)</label>
              <input
                class="field duration-field"
                type="number"
                min="1"
                placeholder="e.g. 30"
                [value]="newDuration()"
                (input)="newDuration.set($any($event.target).value)"
              />
            </div>
            <button
              type="button"
              class="scheduling-toggle"
              [class.active]="newWantsScheduling()"
              [disabled]="!canScheduleNote()"
              (click)="newWantsScheduling.set(!newWantsScheduling())"
            >
              <span class="toggle-pip"></span>
              Find time in my calendar for this
            </button>
            @if (!canScheduleNote()) {
              <p class="scheduling-hint">Set an estimated duration to enable</p>
            }
            <div class="form-actions">
              <button type="button" class="btn-ghost" (click)="resetForm()">Cancel</button>
              <button
                type="button"
                class="btn-primary"
                [disabled]="!newTitle().trim() || saving()"
                (click)="submitNote()"
              >{{ saving() ? 'Adding…' : 'Add note' }}</button>
            </div>
          </div>
        }
      </article>

      @if (sortedNotes().length === 0) {
        <article class="card empty-card">
          <p class="empty-text">Nothing here yet — add a note above.</p>
        </article>
      }

      @for (note of sortedNotes(); track note.id) {
        <article class="card note-card" [class.is-done]="note.completed">
          <div class="note-row">
            <button
              type="button"
              class="check-btn"
              [class.checked]="note.completed"
              (click)="toggleComplete(note)"
              [attr.aria-label]="note.completed ? 'Mark incomplete' : 'Mark complete'"
            >
              @if (note.completed) {
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
              } @else {
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/></svg>
              }
            </button>

            <div class="note-content">
              <p class="note-title">{{ note.title }}</p>
              @if (note.body) {
                <p class="note-body">{{ note.body }}</p>
              }
              @if (note.dueDate || note.estimatedDurationMinutes) {
                <div class="note-meta">
                  @if (note.dueDate) {
                    <span class="meta-badge">{{ formatDue(note.dueDate, note.dueTime) }}</span>
                  }
                  @if (note.estimatedDurationMinutes) {
                    <span class="meta-badge">{{ note.estimatedDurationMinutes }} min</span>
                  }
                </div>
              }
              @if (scheduledLabel(note); as label) {
                <button type="button" class="scheduled-indicator" (click)="openScheduledEvent(note)">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  Scheduled for {{ label }}
                </button>
              } @else if (note.wantsScheduling && !note.linkedCalendarEventId) {
                <div class="pending-row">
                  <span class="meta-badge scheduling-badge pending-label">Scheduling pending</span>
                  <button
                    type="button"
                    class="retry-link"
                    [disabled]="findingSlots()"
                    (click)="retryScheduling(note)"
                  >Retry</button>
                </div>
              }
            </div>

            <button
              type="button"
              class="delete-btn"
              (click)="deleteNote(note.id)"
              aria-label="Delete note"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </article>
      }

      <div class="bottom-spacer"></div>
    </section>

    <app-slot-picker-dialog
      [open]="slotPickerOpen()"
      [note]="pendingNote()"
      [slots]="pendingSlots()"
      (slotSelected)="onSlotSelected($event)"
      (cancelled)="onSlotCancelled()"
    />
  `,
  styles: `
    .page-wrap { display: flex; flex-direction: column; gap: 10px; padding: 16px; max-width: 480px; margin: 0 auto; }
    .page-header { padding: 4px 0 0; }
    .page-title { font-family: Georgia, serif; font-size: 24px; margin: 0; color: var(--color-text); }
    .card { background: var(--color-card); border: 1px solid var(--color-border); border-radius: 12px; padding: 14px; }

    /* Add form */
    .add-row { display: flex; align-items: center; gap: 10px; width: 100%; background: none; border: none; padding: 0; cursor: pointer; color: var(--color-text-secondary); font-size: 14px; }
    .add-row:hover { color: var(--color-primary); }
    .add-placeholder { font-size: 14px; }
    .form-body { display: flex; flex-direction: column; gap: 10px; }
    .field { width: 100%; border: 1px solid var(--color-border); border-radius: 8px; padding: 8px 10px; background: var(--color-card); color: var(--color-text); font-size: 14px; font-family: inherit; box-sizing: border-box; }
    .field:focus { outline: none; border-color: var(--color-primary); }
    .title-field { font-size: 15px; font-weight: 500; }
    .body-field { resize: vertical; min-height: 72px; line-height: 1.5; }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .field-group { display: flex; flex-direction: column; gap: 4px; }
    .field-label { font-size: 12px; font-weight: 600; color: var(--color-text-secondary); }
    .duration-field { width: 120px; }
    .scheduling-toggle { display: flex; align-items: center; gap: 10px; background: var(--color-card); border: 1px solid var(--color-border); border-radius: 8px; padding: 10px 12px; cursor: pointer; font-size: 13px; color: var(--color-text); text-align: left; }
    .scheduling-toggle.active { border-color: var(--color-primary); color: var(--color-primary); background: rgba(45, 77, 122, 0.06); }
    .toggle-pip { width: 14px; height: 14px; border-radius: 50%; border: 2px solid currentColor; flex-shrink: 0; }
    .scheduling-toggle.active .toggle-pip { background: var(--color-primary); border-color: var(--color-primary); }
    .scheduling-toggle:disabled { opacity: 0.45; cursor: not-allowed; }
    .scheduling-hint { margin: -4px 0 0; font-size: 12px; color: var(--color-text-secondary); }
    .form-actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 2px; }
    .btn-primary { background: var(--color-primary); color: #fff; border: none; border-radius: 8px; padding: 9px 18px; font-size: 14px; font-weight: 600; cursor: pointer; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-ghost { background: none; border: 1px solid var(--color-border); border-radius: 8px; padding: 9px 14px; font-size: 14px; color: var(--color-text-secondary); cursor: pointer; }

    /* Empty state */
    .empty-card { border-style: dashed; }
    .empty-text { margin: 0; font-size: 14px; color: var(--color-text-secondary); text-align: center; padding: 8px 0; }

    /* Note cards */
    .note-card { padding: 12px 14px; }
    .note-card.is-done { opacity: 0.55; }
    .note-row { display: flex; align-items: flex-start; gap: 10px; }
    .check-btn { background: none; border: none; padding: 0; cursor: pointer; flex-shrink: 0; margin-top: 1px; color: var(--color-text-secondary); display: flex; }
    .check-btn.checked { color: var(--color-primary); }
    .note-content { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
    .note-title { margin: 0; font-size: 14px; font-weight: 500; color: var(--color-text); line-height: 1.4; word-break: break-word; }
    .note-card.is-done .note-title { text-decoration: line-through; }
    .note-body { margin: 0; font-size: 13px; color: var(--color-text-secondary); line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
    .note-meta { display: flex; flex-wrap: wrap; gap: 6px; }
    .meta-badge { font-size: 11px; color: var(--color-text-secondary); background: rgba(0,0,0,0.04); border-radius: 4px; padding: 2px 6px; }
    .scheduling-badge { color: var(--color-primary); background: rgba(45, 77, 122, 0.08); }
    .delete-btn { background: none; border: none; padding: 2px; cursor: pointer; color: var(--color-text-secondary); flex-shrink: 0; display: flex; border-radius: 4px; opacity: 0.6; }
    .delete-btn:hover { opacity: 1; color: #c0392b; }
    .scheduled-indicator { display: inline-flex; align-items: center; gap: 5px; background: rgba(45, 77, 122, 0.06); border: 1px solid rgba(45, 77, 122, 0.2); border-radius: 6px; padding: 3px 8px; cursor: pointer; font-size: 11px; font-weight: 600; color: var(--color-primary); }
    .scheduled-indicator:hover { background: rgba(45, 77, 122, 0.12); }
    .pending-row { display: flex; align-items: center; gap: 8px; }
    .pending-label { font-size: 11px; }
    .retry-link { background: none; border: none; padding: 0; font-size: 11px; font-weight: 600; color: var(--color-primary); cursor: pointer; text-decoration: underline; }
    .retry-link:disabled { opacity: 0.5; cursor: not-allowed; }

    .bottom-spacer { height: 80px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotesPageComponent {
  private readonly dataStore = inject(DataStoreService);
  private readonly slotSuggestion = inject(SlotSuggestionService);
  private readonly uiFeedback = inject(UiFeedbackService);
  private readonly router = inject(Router);

  private readonly calendarEventsById = computed(() => {
    const map = new Map<string, CalendarEvent>();
    for (const e of this.dataStore.calendarEvents()) {
      map.set(e.id, e);
    }
    return map;
  });

  protected readonly sortedNotes = computed<Note[]>(() => {
    const all = this.dataStore.notes();
    const incomplete = all
      .filter((n) => !n.completed)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const done = all
      .filter((n) => n.completed)
      .sort((a, b) => (b.completedAt ?? b.createdAt).localeCompare(a.completedAt ?? a.createdAt));
    return [...incomplete, ...done];
  });

  protected readonly formExpanded = signal(false);
  protected readonly newTitle = signal('');
  protected readonly newBody = signal('');
  protected readonly newDueDate = signal('');
  protected readonly newDueTime = signal('');
  protected readonly newDuration = signal('');
  protected readonly newWantsScheduling = signal(false);
  protected readonly saving = signal(false);
  protected readonly findingSlots = signal(false);
  protected readonly slotPickerOpen = signal(false);
  protected readonly pendingSlots = signal<SlotCandidate[]>([]);
  protected readonly pendingNote = signal<Note | null>(null);

  protected readonly canScheduleNote = computed(() => {
    const num = Number(this.newDuration());
    return this.newDuration() !== '' && Number.isFinite(num) && num > 0;
  });

  constructor() {
    void this.dataStore.loadNotes();
    effect(() => {
      if (!this.canScheduleNote()) {
        this.newWantsScheduling.set(false);
      }
    });
  }

  protected expandForm(): void {
    this.formExpanded.set(true);
  }

  protected async submitNote(): Promise<void> {
    const title = this.newTitle().trim();
    if (!title) return;

    this.saving.set(true);
    const wantsScheduling = this.newWantsScheduling();
    const duration = this.newDuration() ? Number(this.newDuration()) : undefined;

    const created = await this.dataStore.addNote({
      title,
      body: this.newBody().trim() || undefined,
      dueDate: this.newDueDate() || undefined,
      dueTime: this.newDueTime() || undefined,
      estimatedDurationMinutes: duration && duration > 0 ? duration : undefined,
      wantsScheduling,
    });

    this.resetForm();
    this.saving.set(false);

    if (wantsScheduling && created) {
      await this.findSlotsForNote(created);
    }
  }

  protected async onSlotSelected(slot: SlotCandidate): Promise<void> {
    const note = this.pendingNote();
    if (!note) return;
    this.slotPickerOpen.set(false);
    this.pendingNote.set(null);
    this.pendingSlots.set([]);
    await this.dataStore.createNoteEventFromSlot(note, slot);
    this.uiFeedback.show(`Scheduled for ${slot.label}`);
  }

  protected onSlotCancelled(): void {
    this.slotPickerOpen.set(false);
    this.pendingNote.set(null);
    this.pendingSlots.set([]);
  }

  protected async retryScheduling(note: Note): Promise<void> {
    await this.findSlotsForNote(note);
  }

  protected scheduledLabel(note: Note): string | null {
    if (!note.linkedCalendarEventId) return null;
    const event = this.calendarEventsById().get(note.linkedCalendarEventId);
    if (!event) return null;
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const dayName = event.date
      ? dayNames[(new Date(`${event.date}T00:00:00`).getDay() + 6) % 7]
      : null;
    return dayName ? `${dayName} ${event.startTime}` : event.startTime;
  }

  protected openScheduledEvent(note: Note): void {
    if (!note.linkedCalendarEventId) return;
    const event = this.calendarEventsById().get(note.linkedCalendarEventId);
    void this.router.navigate(['/week'], {
      queryParams: event?.date ? { date: event.date } : {},
    });
  }

  protected resetForm(): void {
    this.newTitle.set('');
    this.newBody.set('');
    this.newDueDate.set('');
    this.newDueTime.set('');
    this.newDuration.set('');
    this.newWantsScheduling.set(false);
    this.formExpanded.set(false);
  }

  protected async toggleComplete(note: Note): Promise<void> {
    await this.dataStore.toggleNoteComplete(note.id, !note.completed);
  }

  protected async deleteNote(id: string): Promise<void> {
    await this.dataStore.deleteNote(id);
  }

  protected formatDue(dueDate: string, dueTime: string | null): string {
    const date = new Date(`${dueDate}T00:00:00`);
    const label = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return dueTime ? `${label} · ${dueTime}` : label;
  }

  private async findSlotsForNote(note: Note): Promise<void> {
    this.findingSlots.set(true);
    this.uiFeedback.show('Finding good times…', 5000);
    const slots = await this.slotSuggestion.suggestSlotsForNote(note);
    this.findingSlots.set(false);

    if (slots.length === 0) {
      this.uiFeedback.show("Couldn't find a free slot this week. Set a due date to suggest a different week.", 4000);
      return;
    }

    this.pendingNote.set(note);
    this.pendingSlots.set(slots);
    this.slotPickerOpen.set(true);
  }
}
