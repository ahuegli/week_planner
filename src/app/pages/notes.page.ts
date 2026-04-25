import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DataStoreService } from '../core/services/data-store.service';
import { Note } from '../core/models/app-data.models';

@Component({
  selector: 'app-notes-page',
  standalone: true,
  imports: [],
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
              (click)="newWantsScheduling.set(!newWantsScheduling())"
            >
              <span class="toggle-pip"></span>
              Find time in my calendar for this
            </button>
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
              @if (note.dueDate || note.estimatedDurationMinutes || note.wantsScheduling) {
                <div class="note-meta">
                  @if (note.dueDate) {
                    <span class="meta-badge">{{ formatDue(note.dueDate, note.dueTime) }}</span>
                  }
                  @if (note.estimatedDurationMinutes) {
                    <span class="meta-badge">{{ note.estimatedDurationMinutes }} min</span>
                  }
                  @if (note.wantsScheduling) {
                    <span class="meta-badge scheduling-badge">Find time</span>
                  }
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

    .bottom-spacer { height: 80px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotesPageComponent {
  private readonly dataStore = inject(DataStoreService);

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

  constructor() {
    void this.dataStore.loadNotes();
  }

  protected expandForm(): void {
    this.formExpanded.set(true);
  }

  protected async submitNote(): Promise<void> {
    const title = this.newTitle().trim();
    if (!title) {
      return;
    }

    this.saving.set(true);
    const duration = this.newDuration() ? Number(this.newDuration()) : undefined;

    await this.dataStore.addNote({
      title,
      body: this.newBody().trim() || undefined,
      dueDate: this.newDueDate() || undefined,
      dueTime: this.newDueTime() || undefined,
      estimatedDurationMinutes: duration && duration > 0 ? duration : undefined,
      wantsScheduling: this.newWantsScheduling(),
    });

    this.resetForm();
    this.saving.set(false);
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
}
