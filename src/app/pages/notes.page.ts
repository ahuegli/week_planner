import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SlotPickerDialogComponent } from '../components/slot-picker-dialog/slot-picker-dialog.component';
import { CalendarEvent, Note, SlotCandidate, TaskCategory } from '../core/models/app-data.models';
import { DataStoreService } from '../core/services/data-store.service';
import { StatsApiService } from '../core/services/stats-api.service';
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
        <button type="button" class="header-settings" aria-label="Open settings" (click)="openSettings()">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
      </header>

      <div class="search-wrap">
        <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.3-4.3"></path>
        </svg>
        <input
          class="field search-input"
          type="text"
          placeholder="Search notes..."
          [value]="searchQuery()"
          (input)="searchQuery.set($any($event.target).value)"
          aria-label="Search notes"
        />
        @if (searchQuery().trim().length > 0) {
          <button type="button" class="search-clear-btn" (click)="clearSearch()" aria-label="Clear search">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="m15 9-6 6"></path>
              <path d="m9 9 6 6"></path>
            </svg>
          </button>
        }
      </div>

      <div class="filter-strip" role="tablist" aria-label="Note filters">
        <button type="button" class="filter-pill" [class.selected]="activeFilter() === 'all'" [attr.aria-selected]="activeFilter() === 'all'" (click)="setFilter('all')">All</button>
        <button type="button" class="filter-pill" [class.selected]="activeFilter() === 'tasks'" [attr.aria-selected]="activeFilter() === 'tasks'" (click)="setFilter('tasks')">Tasks</button>
        <button type="button" class="filter-pill" [class.selected]="activeFilter() === 'projects'" [attr.aria-selected]="activeFilter() === 'projects'" (click)="setFilter('projects')">Projects</button>
        <button type="button" class="filter-pill" [class.selected]="activeFilter() === 'reminders'" [attr.aria-selected]="activeFilter() === 'reminders'" (click)="setFilter('reminders')">Reminders</button>
      </div>

      @if (tasksCompletedTotal() > 0) {
        <div class="streak-wrap">
          <button type="button" class="streak-pill" [class.active]="(streakDays() ?? 0) > 0"
                  (click)="streakTooltipOpen.update(v => !v)" aria-label="Streak info">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="1.75"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 01-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/>
            </svg>
            <span>{{ (streakDays() ?? 0) > 0 ? streakDays() + ' day streak' : 'Start a new streak' }}</span>
          </button>
          @if (streakTooltipOpen()) {
            <p class="streak-tooltip">Complete at least one task or workout per day to maintain your streak. Days with nothing scheduled don't count against you.</p>
          }
        </div>
      }

      <article class="card add-card">
        @if (!formExpanded()) {
          <button type="button" class="add-row" (click)="expandForm()">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span class="add-placeholder">New note...</span>
          </button>
        } @else {
          <div class="form-body">
            <p class="form-mode-label">{{ isReminderCreateMode() ? 'Reminder' : 'Task' }} details</p>
            <input
              class="field title-field"
              type="text"
              [placeholder]="isReminderCreateMode() ? 'Reminder title' : 'Title'"
              [value]="newTitle()"
              (input)="newTitle.set($any($event.target).value)"
            />
            <textarea
              class="field body-field"
              [placeholder]="isReminderCreateMode() ? 'What to remember (address, instructions, etc.)' : 'Details (optional)'"
              [value]="newBody()"
              (input)="newBody.set($any($event.target).value)"
              [rows]="isReminderCreateMode() ? 5 : 3"
            ></textarea>
            @if (isReminderCreateMode()) {
              <div class="field-group">
                <label class="field-label">Due date (optional)</label>
                <input
                  class="field"
                  type="date"
                  [value]="newDueDate()"
                  (input)="newDueDate.set($any($event.target).value)"
                />
              </div>
            } @else {
              <div class="category-chip-row" role="group" aria-label="Task category">
                @for (cat of TASK_CATEGORIES; track cat.value) {
                  <button type="button" class="category-chip" [class.selected]="newCategory() === cat.value" (click)="newCategory.set(cat.value)">{{ cat.label }}</button>
                }
              </div>
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
            }
            <div class="form-actions">
              <button type="button" class="btn-ghost" (click)="resetForm()">Cancel</button>
              <button
                type="button"
                class="btn-primary"
                [disabled]="!newTitle().trim() || saving()"
                (click)="submitNote()"
              >{{ saving() ? 'Adding…' : (isReminderCreateMode() ? 'Add reminder' : 'Add note') }}</button>
            </div>
          </div>
        }
      </article>

      @if (visibleNotes().length === 0) {
        <article class="card empty-card">
          <p class="empty-text">{{ emptyStateText() }}</p>
        </article>
      }

      @for (note of visibleNotes(); track note.id) {

        @if (noteMode(note) === 'project') {
          <article class="card note-card project-card" [class.is-done]="note.completed" [class.completing]="completingNoteId() === note.id">
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
                @if (note.description || note.body) {
                  <p class="note-body">{{ note.description ?? note.body }}</p>
                }
                @if (note.isOwner === false && note.sharedBy) {
                  <div class="shared-by-row">
                    <span class="shared-by-badge">Shared by {{ note.sharedBy.email }}</span>
                  </div>
                }
                <ul class="subtask-list">
                  @for (sub of subtasksByParent().get(note.id) ?? []; track sub.id) {
                    <li class="subtask-row">
                      <button
                        type="button"
                        class="subtask-status-btn"
                        [class.status-not-started]="(sub.subtaskStatus ?? 'not_started') === 'not_started'"
                        [class.status-in-progress]="sub.subtaskStatus === 'in_progress'"
                        [class.status-done]="sub.subtaskStatus === 'done'"
                        [class.subtask-anim]="animatingSubtaskId() === sub.id"
                        (click)="cycleSubTaskStatus(sub)"
                        [attr.aria-label]="'Cycle status, currently: ' + (sub.subtaskStatus ?? 'not started')"
                      >
                        @if ((sub.subtaskStatus ?? 'not_started') === 'not_started') {
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke-dasharray="3.5 3"/></svg>
                        } @else if (sub.subtaskStatus === 'in_progress') {
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" opacity="0.25"/><path d="M12 3 A9 9 0 0 1 21 12"/></svg>
                        } @else {
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                        }
                      </button>
                      <span class="subtask-title" [class.subtask-done]="sub.subtaskStatus === 'done'">{{ sub.title }}</span>
                      <button
                        type="button"
                        class="subtask-delete"
                        (click)="deleteNote(sub.id)"
                        aria-label="Delete sub-task"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </li>
                  }
                </ul>
                @if (addingSubtaskForId() === note.id) {
                  <div class="subtask-add-row">
                    <input
                      class="subtask-input"
                      type="text"
                      placeholder="Sub-task title"
                      [value]="newSubtaskTitle()"
                      (input)="newSubtaskTitle.set($any($event.target).value)"
                      (keydown.enter)="submitSubtask(note.id)"
                      (keydown.escape)="cancelAddSubtask()"
                      autofocus
                    />
                    <button type="button" class="subtask-save-btn" [disabled]="!newSubtaskTitle().trim()" (click)="submitSubtask(note.id)">Add</button>
                    <button type="button" class="subtask-cancel-btn" (click)="cancelAddSubtask()">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                } @else {
                  <button type="button" class="add-subtask-btn" (click)="startAddSubtask(note.id)">+ sub-task</button>
                }
              </div>

              <button type="button" class="edit-btn" (click)="openEditModal(note)" aria-label="Edit note">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              @if (note.isOwner !== false) {
                <button type="button" class="share-btn" (click)="openSharePanel(note)" aria-label="Share project">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                </button>
              }
              @if (note.isOwner !== false) {
                <button type="button" class="delete-btn" (click)="deleteNote(note.id)" aria-label="Delete note">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              }
            </div>
          </article>

        } @else if (noteMode(note) === 'reminder') {
          <article class="card note-card reminder-card" [class.is-done]="note.completed" [class.completing]="completingNoteId() === note.id">
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
                @if (note.description || note.body) {
                  <p class="note-body">{{ note.description ?? note.body }}</p>
                }
                @if (note.dueDate) {
                  <div class="note-meta">
                    <span class="meta-badge">{{ formatDue(note.dueDate, note.dueTime) }}</span>
                  </div>
                }
              </div>

              <button type="button" class="edit-btn" (click)="openEditModal(note)" aria-label="Edit note">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button type="button" class="delete-btn" (click)="deleteNote(note.id)" aria-label="Delete note">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </article>

        } @else {
          <article class="card note-card" [class.is-done]="note.completed" [class.completing]="completingNoteId() === note.id">
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

              <button type="button" class="edit-btn" (click)="openEditModal(note)" aria-label="Edit note">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              @if (note.isOwner !== false) {
                <button type="button" class="share-btn" (click)="openSharePanel(note)" aria-label="Share task">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                </button>
              }
              <button type="button" class="delete-btn" (click)="deleteNote(note.id)" aria-label="Delete note">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </article>
        }

      }

      @if (showConfetti()) {
        <div class="confetti-overlay" aria-hidden="true">
          <span class="confetti-p"></span>
          <span class="confetti-p"></span>
          <span class="confetti-p"></span>
          <span class="confetti-p"></span>
          <span class="confetti-p"></span>
          <span class="confetti-p"></span>
          <span class="confetti-p"></span>
          <span class="confetti-p"></span>
        </div>
      }
      <div class="bottom-spacer"></div>
    </section>

    @if (editingNote(); as note) {
      <div class="modal-backdrop" (click)="closeEditModal()">
        <div class="modal-panel" (click)="$event.stopPropagation()">
          <header class="modal-header">
            <h2 class="modal-title">Edit note</h2>
            <button type="button" class="modal-close" (click)="closeEditModal()" aria-label="Close">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </header>

          <div class="modal-body">
            <input
              class="field title-field"
              type="text"
              placeholder="Note title"
              [value]="editTitle()"
              (input)="editTitle.set($any($event.target).value)"
            />
            <textarea
              class="field body-field"
              placeholder="Details (optional)"
              [value]="editBody()"
              (input)="editBody.set($any($event.target).value)"
              rows="3"
            ></textarea>
            <div class="field-row">
              <div class="field-group">
                <label class="field-label">Due date</label>
                <input
                  class="field"
                  type="date"
                  [value]="editDueDate()"
                  (input)="editDueDate.set($any($event.target).value)"
                />
              </div>
              <div class="field-group">
                <label class="field-label">Time</label>
                <input
                  class="field"
                  type="time"
                  [value]="editDueTime()"
                  (input)="editDueTime.set($any($event.target).value)"
                />
              </div>
            </div>

            @if (note.noteType !== 'reminder') {
              <div class="category-chip-row" role="group" aria-label="Task category">
                @for (cat of TASK_CATEGORIES; track cat.value) {
                  <button type="button" class="category-chip" [class.selected]="editCategory() === cat.value" (click)="editCategory.set(cat.value)">{{ cat.label }}</button>
                }
              </div>
              <div class="field-group">
                <label class="field-label">Estimated duration (min)</label>
                <input
                  class="field duration-field"
                  type="number"
                  min="1"
                  placeholder="e.g. 30"
                  [value]="editDuration()"
                  (input)="editDuration.set($any($event.target).value)"
                />
              </div>

              <div class="subtasks-section">
                <p class="field-label subtasks-label">Sub-tasks</p>
                <ul class="subtask-list">
                  @for (sub of subtasksByParent().get(note.id) ?? []; track sub.id) {
                    <li class="subtask-row">
                      <button
                        type="button"
                        class="subtask-status-btn"
                        [class.status-not-started]="(sub.subtaskStatus ?? 'not_started') === 'not_started'"
                        [class.status-in-progress]="sub.subtaskStatus === 'in_progress'"
                        [class.status-done]="sub.subtaskStatus === 'done'"
                        [class.subtask-anim]="animatingSubtaskId() === sub.id"
                        (click)="cycleSubTaskStatus(sub)"
                        [attr.aria-label]="'Cycle status, currently: ' + (sub.subtaskStatus ?? 'not started')"
                      >
                        @if ((sub.subtaskStatus ?? 'not_started') === 'not_started') {
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke-dasharray="3.5 3"/></svg>
                        } @else if (sub.subtaskStatus === 'in_progress') {
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" opacity="0.25"/><path d="M12 3 A9 9 0 0 1 21 12"/></svg>
                        } @else {
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                        }
                      </button>
                      <input
                        class="subtask-title-input"
                        type="text"
                        [value]="sub.title"
                        [class.subtask-done]="sub.subtaskStatus === 'done'"
                        (blur)="saveSubtaskTitle(sub, $any($event.target).value)"
                        (keydown.enter)="$any($event.target).blur()"
                      />
                      <button
                        type="button"
                        class="subtask-delete"
                        (click)="deleteNote(sub.id)"
                        aria-label="Delete sub-task"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </li>
                  }
                </ul>

                @if (editAddingSubtask()) {
                  <div class="subtask-add-row">
                    <input
                      class="subtask-input"
                      type="text"
                      placeholder="Sub-task title"
                      [value]="editNewSubtaskTitle()"
                      (input)="editNewSubtaskTitle.set($any($event.target).value)"
                      (keydown.enter)="submitEditSubtask(note.id)"
                      (keydown.escape)="editAddingSubtask.set(false)"
                      autofocus
                    />
                    <button type="button" class="subtask-save-btn" [disabled]="!editNewSubtaskTitle().trim()" (click)="submitEditSubtask(note.id)">Add</button>
                    <button type="button" class="subtask-cancel-btn" (click)="editAddingSubtask.set(false)">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                } @else {
                  <button type="button" class="add-subtask-btn" (click)="editAddingSubtask.set(true); editNewSubtaskTitle.set('')">+ Add sub-task</button>
                }
              </div>
            }
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-ghost" (click)="closeEditModal()">Cancel</button>
            <button
              type="button"
              class="btn-primary"
              [disabled]="!editTitle().trim() || editSaving()"
              (click)="saveEdit()"
            >{{ editSaving() ? 'Saving…' : 'Save' }}</button>
          </div>
        </div>
      </div>
    }

    @if (sharingNote(); as note) {
      <div class="modal-backdrop" (click)="closeSharePanel()">
        <div class="modal-panel" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2 class="modal-title">Share "{{ note.title }}"</h2>
            <button type="button" class="modal-close" (click)="closeSharePanel()" aria-label="Close">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            @if (sharesForNote().length > 0) {
              <div class="share-list">
                @for (share of sharesForNote(); track share.id) {
                  <div class="share-list-row">
                    <span class="share-list-email">{{ share.recipientEmail }}</span>
                    <span class="share-permission-badge">{{ share.permission === 'collaborate' ? 'Can edit' : 'View only' }}</span>
                    <button type="button" class="text-danger" (click)="revokeNoteShareFromPanel(share.id)">Revoke</button>
                  </div>
                }
              </div>
            } @else {
              <p class="share-empty-text">Not shared with anyone yet.</p>
            }

            <div class="share-form-section">
              <input
                class="field"
                type="email"
                placeholder="Email address"
                [value]="noteShareEmail()"
                (input)="noteShareEmail.set($any($event.target).value)"
                (keydown.enter)="submitNoteShare()"
              />
              <div class="share-perm-row">
                <label>
                  <input type="radio" name="note-share-perm" value="collaborate" [checked]="noteSharePermission() === 'collaborate'" (change)="noteSharePermission.set('collaborate')" />
                  Can edit
                </label>
                <label>
                  <input type="radio" name="note-share-perm" value="view" [checked]="noteSharePermission() === 'view'" (change)="noteSharePermission.set('view')" />
                  View only
                </label>
              </div>
              @if (noteShareError()) {
                <p class="share-error-text">{{ noteShareError() }}</p>
              }
              <div class="modal-footer" style="padding: 0; border-top: none;">
                <button type="button" class="btn-ghost" (click)="closeSharePanel()">Cancel</button>
                <button
                  type="button"
                  class="btn-primary"
                  [disabled]="!noteShareEmail().trim() || noteShareSubmitting()"
                  (click)="submitNoteShare()"
                >{{ noteShareSubmitting() ? 'Sharing…' : 'Share' }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    }

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
    .page-header { padding: 4px 0 0; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .page-title { font-family: Georgia, serif; font-size: 24px; margin: 0; color: var(--color-text); }
    .header-settings { width: 34px; height: 34px; border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-card); display: inline-flex; align-items: center; justify-content: center; color: var(--color-text-secondary); cursor: pointer; }
    .header-settings:hover { color: var(--color-primary); border-color: rgba(45, 77, 122, 0.28); }
    .search-wrap { position: relative; width: 100%; margin-bottom: 2px; }
    .search-input { padding-left: 34px; padding-right: 34px; }
    .search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--color-text-secondary); pointer-events: none; }
    .search-clear-btn { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); border: none; background: none; width: 24px; height: 24px; border-radius: 50%; padding: 0; display: inline-flex; align-items: center; justify-content: center; color: var(--color-text-secondary); cursor: pointer; }
    .search-clear-btn:hover { color: var(--color-text); }
    .filter-strip { display: flex; align-items: center; gap: 8px; overflow-x: auto; }
    .filter-pill { border: 1px solid var(--color-border); background: var(--color-card); color: var(--color-text-secondary); border-radius: 999px; padding: 7px 14px; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
    .filter-pill.selected { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }
    .card { background: var(--color-card); border: 1px solid var(--color-border); border-radius: 12px; padding: 14px; }

    .add-row { display: flex; align-items: center; gap: 10px; width: 100%; background: none; border: none; padding: 0; cursor: pointer; color: var(--color-text-secondary); font-size: 14px; }
    .add-row:hover { color: var(--color-primary); }
    .add-placeholder { font-size: 14px; }
    .form-body { display: flex; flex-direction: column; gap: 10px; }
    .field { width: 100%; border: 1px solid var(--color-border); border-radius: 8px; padding: 8px 10px; background: var(--color-card); color: var(--color-text); font-size: 14px; font-family: inherit; box-sizing: border-box; }
    .field:focus { outline: none; border-color: var(--color-primary); }
    .form-mode-label { margin: 0; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-text-secondary); }
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

    .empty-card { border-style: dashed; }
    .empty-text { margin: 0; font-size: 14px; color: var(--color-text-secondary); text-align: center; padding: 8px 0; }

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
    .edit-btn { background: none; border: none; padding: 2px; cursor: pointer; color: var(--color-text-secondary); flex-shrink: 0; display: flex; border-radius: 4px; opacity: 0.45; }
    .edit-btn:hover { opacity: 1; color: var(--color-primary); }
    .delete-btn { background: none; border: none; padding: 2px; cursor: pointer; color: var(--color-text-secondary); flex-shrink: 0; display: flex; border-radius: 4px; opacity: 0.6; }
    .delete-btn:hover { opacity: 1; color: #c0392b; }
    .scheduled-indicator { display: inline-flex; align-items: center; gap: 5px; background: rgba(45, 77, 122, 0.06); border: 1px solid rgba(45, 77, 122, 0.2); border-radius: 6px; padding: 3px 8px; cursor: pointer; font-size: 11px; font-weight: 600; color: var(--color-primary); }
    .scheduled-indicator:hover { background: rgba(45, 77, 122, 0.12); }
    .pending-row { display: flex; align-items: center; gap: 8px; }
    .pending-label { font-size: 11px; }
    .retry-link { background: none; border: none; padding: 0; font-size: 11px; font-weight: 600; color: var(--color-primary); cursor: pointer; text-decoration: underline; }
    .retry-link:disabled { opacity: 0.5; cursor: not-allowed; }

    .subtask-list { list-style: none; margin: 4px 0 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
    .subtask-row { display: flex; align-items: center; gap: 7px; }
    .subtask-status-btn { background: none; border: none; padding: 0; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; }
    .subtask-status-btn.status-not-started { color: var(--color-text-secondary); }
    .subtask-status-btn.status-in-progress { color: #C4923A; }
    .subtask-status-btn.status-done { color: var(--color-primary); }
    .subtask-title { flex: 1; font-size: 13px; color: var(--color-text); line-height: 1.4; min-width: 0; word-break: break-word; }
    .subtask-done { text-decoration: line-through; color: var(--color-text-secondary); }
    .subtask-delete { background: none; border: none; padding: 2px; cursor: pointer; color: var(--color-text-secondary); flex-shrink: 0; display: flex; border-radius: 3px; opacity: 0.4; }
    .subtask-delete:hover { opacity: 1; color: #c0392b; }
    .add-subtask-btn { background: none; border: none; padding: 0; margin-top: 4px; cursor: pointer; font-size: 12px; font-weight: 600; color: var(--color-primary); opacity: 0.7; }
    .add-subtask-btn:hover { opacity: 1; }
    .subtask-add-row { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
    .subtask-input { flex: 1; border: 1px solid var(--color-border); border-radius: 6px; padding: 5px 8px; font-size: 13px; font-family: inherit; background: var(--color-card); color: var(--color-text); min-width: 0; }
    .subtask-input:focus { outline: none; border-color: var(--color-primary); }
    .subtask-save-btn { background: var(--color-primary); color: #fff; border: none; border-radius: 6px; padding: 5px 10px; font-size: 12px; font-weight: 600; cursor: pointer; flex-shrink: 0; }
    .subtask-save-btn:disabled { opacity: 0.45; cursor: not-allowed; }
    .subtask-cancel-btn { background: none; border: none; padding: 4px; cursor: pointer; color: var(--color-text-secondary); flex-shrink: 0; display: flex; }

    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 1000; display: flex; align-items: flex-end; justify-content: center; }
    .modal-panel { background: var(--color-card); border-radius: 16px 16px 0 0; width: 100%; max-width: 480px; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden; }
    .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 16px 12px; border-bottom: 1px solid var(--color-border); flex-shrink: 0; }
    .modal-title { font-family: Georgia, serif; font-size: 18px; margin: 0; color: var(--color-text); }
    .modal-close { background: none; border: none; padding: 4px; cursor: pointer; color: var(--color-text-secondary); display: flex; border-radius: 4px; }
    .modal-close:hover { color: var(--color-text); }
    .modal-body { flex: 1; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--color-border); flex-shrink: 0; }
    .subtasks-section { display: flex; flex-direction: column; gap: 6px; padding-top: 4px; }
    .subtasks-label { margin: 0; }
    .subtask-title-input { flex: 1; border: none; border-bottom: 1px solid transparent; padding: 2px 4px; font-size: 13px; font-family: inherit; background: transparent; color: var(--color-text); min-width: 0; }
    .subtask-title-input:focus { outline: none; border-bottom-color: var(--color-primary); }
    .subtask-title-input.subtask-done { text-decoration: line-through; color: var(--color-text-secondary); }

    .shared-by-row { display: flex; align-items: center; gap: 6px; margin-top: 2px; }
    .shared-by-badge { font-size: 11px; color: var(--color-primary); background: rgba(45, 77, 122, 0.08); border: 1px solid rgba(45, 77, 122, 0.18); border-radius: 4px; padding: 2px 6px; }
    .share-btn { background: none; border: none; padding: 2px; cursor: pointer; color: var(--color-text-secondary); flex-shrink: 0; display: flex; border-radius: 4px; opacity: 0.45; }
    .share-btn:hover { opacity: 1; color: var(--color-primary); }
    .share-list { display: flex; flex-direction: column; gap: 8px; }
    .share-list-row { display: flex; align-items: center; gap: 8px; }
    .share-list-email { flex: 1; font-size: 14px; color: var(--color-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .share-permission-badge { font-size: 12px; background: rgba(45, 77, 122, 0.08); border-radius: 4px; padding: 2px 8px; color: var(--color-primary); flex-shrink: 0; }
    .share-empty-text { font-size: 13px; color: var(--color-text-secondary); margin: 0; }
    .share-form-section { display: flex; flex-direction: column; gap: 8px; padding-top: 12px; border-top: 1px solid var(--color-border); margin-top: 4px; }
    .share-perm-row { display: flex; gap: 20px; font-size: 13px; color: var(--color-text); }
    .share-perm-row label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
    .share-error-text { font-size: 12px; color: #c0392b; margin: 0; }
    .text-danger { background: none; border: none; padding: 0; font-size: 12px; font-weight: 600; color: #c0392b; cursor: pointer; text-decoration: underline; flex-shrink: 0; }

    .bottom-spacer { height: 80px; }

    .category-chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
    .category-chip { border: 1px solid var(--color-border); background: var(--color-card); color: var(--color-text-secondary); border-radius: 999px; padding: 4px 10px; font-size: 11px; font-weight: 600; cursor: pointer; white-space: nowrap; }
    .category-chip.selected { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }
    .category-chip:hover:not(.selected) { border-color: var(--color-primary); color: var(--color-primary); }

    .streak-wrap { display: flex; flex-direction: column; gap: 6px; }
    .streak-pill { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--color-border); border-radius: 999px; padding: 5px 12px 5px 10px; font-size: 12px; font-weight: 600; cursor: pointer; background: var(--color-card); color: var(--color-text-secondary); align-self: flex-start; }
    .streak-pill.active { color: #C4923A; border-color: rgba(196, 146, 58, 0.35); background: rgba(196, 146, 58, 0.07); }
    .streak-pill.active svg { stroke: #C4923A; }
    .streak-tooltip { margin: 0; font-size: 12px; line-height: 1.55; color: var(--color-text-secondary); background: var(--color-card); border: 1px solid var(--color-border); border-radius: 8px; padding: 9px 12px; }

    @keyframes card-pulse { 0%,100% { transform:scale(1); } 45% { transform:scale(1.03); } }
    .note-card.completing { animation: card-pulse 320ms ease-out; }

    @keyframes check-pop { 0% { opacity:0; transform:scale(.5); } 100% { opacity:1; transform:scale(1); } }
    .note-card.completing .check-btn.checked svg { animation: check-pop 220ms ease-out; }

    @keyframes arc-draw { 0% { opacity:0; transform:rotate(-30deg) scale(.7); } 100% { opacity:1; transform:rotate(0) scale(1); } }
    @keyframes check-snap { 0% { transform:scale(0); opacity:0; } 65% { transform:scale(1.25); } 100% { transform:scale(1); opacity:1; } }
    .subtask-status-btn.subtask-anim.status-in-progress svg { animation: arc-draw 220ms ease-out; }
    .subtask-status-btn.subtask-anim.status-done svg { animation: check-snap 200ms ease-out; }

    @keyframes confetti-fall { 0% { transform:translateY(0) rotate(0deg); opacity:1; } 100% { transform:translateY(160px) rotate(400deg); opacity:0; } }
    .confetti-overlay { position:fixed; top:18%; left:0; right:0; height:200px; pointer-events:none; z-index:9999; overflow:hidden; }
    .confetti-p { position:absolute; width:7px; height:7px; border-radius:2px; animation:confetti-fall 800ms ease-in forwards; }
    .confetti-p:nth-child(1) { left:12%; background:#e74c3c; animation-delay:0ms; }
    .confetti-p:nth-child(2) { left:24%; background:#f39c12; animation-delay:50ms; }
    .confetti-p:nth-child(3) { left:38%; background:#2ecc71; animation-delay:20ms; }
    .confetti-p:nth-child(4) { left:50%; background:#3498db; animation-delay:70ms; }
    .confetti-p:nth-child(5) { left:62%; background:#9b59b6; animation-delay:35ms; }
    .confetti-p:nth-child(6) { left:74%; background:#e74c3c; animation-delay:55ms; }
    .confetti-p:nth-child(7) { left:84%; background:#f1c40f; animation-delay:15ms; }
    .confetti-p:nth-child(8) { left:30%; background:#1abc9c; animation-delay:80ms; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotesPageComponent {
  private readonly dataStore = inject(DataStoreService);
  private readonly statsApi = inject(StatsApiService);
  private readonly slotSuggestion = inject(SlotSuggestionService);
  private readonly uiFeedback = inject(UiFeedbackService);
  private readonly router = inject(Router);

  protected readonly TASK_CATEGORIES: { value: TaskCategory; label: string }[] = [
    { value: 'quick_admin', label: 'Quick' },
    { value: 'long_admin', label: 'Long admin' },
    { value: 'errand', label: 'Errand' },
    { value: 'deep_work', label: 'Deep work' },
    { value: 'personal', label: 'Personal' },
    { value: 'other', label: 'Other' },
  ];

  protected readonly subtasksByParent = this.dataStore.subtasksByParent;

  private readonly calendarEventsById = computed(() => {
    const map = new Map<string, CalendarEvent>();
    for (const e of this.dataStore.calendarEvents()) {
      map.set(e.id, e);
    }
    return map;
  });

  protected readonly sortedNotes = computed<Note[]>(() => {
    const all = this.dataStore.notes().filter((n) => !n.parentNoteId);
    const incomplete = all
      .filter((n) => !n.completed)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const done = all
      .filter((n) => n.completed)
      .sort((a, b) => (b.completedAt ?? b.createdAt).localeCompare(a.completedAt ?? a.createdAt));
    return [...incomplete, ...done];
  });

  protected readonly activeFilter = signal<'all' | 'tasks' | 'projects' | 'reminders'>('all');
  protected readonly searchQuery = signal('');
  protected readonly visibleNotes = computed<Note[]>(() => {
    const notes = this.sortedNotes();
    const filter = this.activeFilter();
    const query = this.searchQuery().trim().toLowerCase();
    const byParent = this.subtasksByParent();

    let filteredByPill: Note[];

    if (filter === 'all') {
      filteredByPill = notes;
    } else if (filter === 'tasks') {
      filteredByPill = notes.filter((n) => (n.noteType === 'task' || !n.noteType) && !byParent.has(n.id));
    } else if (filter === 'projects') {
      filteredByPill = notes.filter((n) => (n.noteType === 'task' || !n.noteType) && byParent.has(n.id));
    } else {
      filteredByPill = notes.filter((n) => n.noteType === 'reminder');
    }

    if (!query) return filteredByPill;

    return filteredByPill.filter((note) => {
      const title = note.title.toLowerCase();
      const description = (note.description ?? note.body ?? '').toLowerCase();
      const noteMatches = title.includes(query) || description.includes(query);

      if (noteMatches) return true;

      const subtasks = byParent.get(note.id) ?? [];
      return subtasks.some((sub) => sub.title.toLowerCase().includes(query));
    });
  });

  protected readonly formExpanded = signal(false);
  protected readonly newTitle = signal('');
  protected readonly newBody = signal('');
  protected readonly newDueDate = signal('');
  protected readonly newDueTime = signal('');
  protected readonly newDuration = signal('');
  protected readonly newWantsScheduling = signal(false);
  protected readonly newCategory = signal<TaskCategory>('other');
  protected readonly saving = signal(false);
  protected readonly findingSlots = signal(false);
  protected readonly slotPickerOpen = signal(false);
  protected readonly pendingSlots = signal<SlotCandidate[]>([]);
  protected readonly pendingNote = signal<Note | null>(null);

  protected readonly createNoteType = computed<'task' | 'reminder'>(() =>
    this.activeFilter() === 'reminders' ? 'reminder' : 'task',
  );
  protected readonly isReminderCreateMode = computed(() => this.createNoteType() === 'reminder');

  protected readonly addingSubtaskForId = signal<string | null>(null);
  protected readonly newSubtaskTitle = signal('');

  protected readonly editingNote = signal<Note | null>(null);
  protected readonly editTitle = signal('');
  protected readonly editBody = signal('');
  protected readonly editDueDate = signal('');
  protected readonly editDueTime = signal('');
  protected readonly editDuration = signal('');
  protected readonly editCategory = signal<TaskCategory>('other');
  protected readonly editSaving = signal(false);
  protected readonly editAddingSubtask = signal(false);
  protected readonly editNewSubtaskTitle = signal('');

  protected readonly sharingNote = signal<Note | null>(null);
  protected readonly noteShareEmail = signal('');
  protected readonly noteSharePermission = signal<'view' | 'collaborate'>('collaborate');
  protected readonly noteShareError = signal<string | null>(null);
  protected readonly noteShareSubmitting = signal(false);

  protected readonly completingNoteId = signal<string | null>(null);
  protected readonly animatingSubtaskId = signal<string | null>(null);
  protected readonly showConfetti = signal(false);
  protected readonly streakDays = signal<number | null>(null);
  protected readonly tasksCompletedTotal = signal<number>(0);
  protected readonly streakTooltipOpen = signal(false);

  protected readonly canScheduleNote = computed(() => {
    const num = Number(this.newDuration());
    return this.newDuration() !== '' && Number.isFinite(num) && num > 0;
  });

  protected readonly emptyStateText = computed(() => {
    const term = this.searchQuery().trim();
    if (term.length > 0) return `No notes match '${term}'`;

    const filter = this.activeFilter();
    if (filter === 'reminders') return 'No reminders yet.';
    if (filter === 'projects') return 'No projects yet — add a sub-task to any task to turn it into a project.';
    if (filter === 'tasks') return 'No tasks yet. Capture something to do.';
    return 'No notes yet. Capture a task, a thought, or something to remember.';
  });

  protected readonly sharesForNote = computed(() => {
    const note = this.sharingNote();
    if (!note) return [];
    return this.dataStore.outgoingNoteShares().filter(s => s.noteId === note.id && s.active);
  });

  constructor() {
    void this.dataStore.loadNotes();
    void this.loadStreakData();
    effect(() => {
      if (!this.canScheduleNote()) {
        this.newWantsScheduling.set(false);
      }
    });
    effect(() => {
      if (this.isReminderCreateMode()) {
        this.newDueTime.set('');
        this.newDuration.set('');
        this.newWantsScheduling.set(false);
      }
    });
  }

  protected expandForm(): void {
    this.formExpanded.set(true);
  }

  protected setFilter(filter: 'all' | 'tasks' | 'projects' | 'reminders'): void {
    this.activeFilter.set(filter);
  }

  protected clearSearch(): void {
    this.searchQuery.set('');
  }

  protected openSettings(): void {
    void this.router.navigate(['/settings']);
  }

  protected noteMode(note: Note): 'task' | 'project' | 'reminder' {
    if (note.noteType === 'reminder') return 'reminder';
    return this.subtasksByParent().has(note.id) ? 'project' : 'task';
  }

  protected cycleSubTaskStatus(sub: Note): void {
    const current = sub.subtaskStatus ?? 'not_started';
    const next: Record<string, 'not_started' | 'in_progress' | 'done'> = {
      not_started: 'in_progress',
      in_progress: 'done',
      done: 'not_started',
    };
    const nextStatus = next[current];
    if (nextStatus === 'in_progress' || nextStatus === 'done') {
      this.animatingSubtaskId.set(sub.id);
      setTimeout(() => this.animatingSubtaskId.set(null), 280);
    }
    void this.dataStore.updateSubTaskStatus(sub.id, nextStatus);
  }

  protected startAddSubtask(parentId: string): void {
    this.addingSubtaskForId.set(parentId);
    this.newSubtaskTitle.set('');
  }

  protected cancelAddSubtask(): void {
    this.addingSubtaskForId.set(null);
    this.newSubtaskTitle.set('');
  }

  protected async submitSubtask(parentId: string): Promise<void> {
    const title = this.newSubtaskTitle().trim();
    if (!title) return;
    await this.dataStore.addNote({ title, parentNoteId: parentId, subtaskStatus: 'not_started' });
    this.cancelAddSubtask();
  }

  protected openEditModal(note: Note): void {
    this.editingNote.set(note);
    this.editTitle.set(note.title);
    this.editBody.set(note.description ?? note.body ?? '');
    this.editDueDate.set(note.dueDate ?? '');
    this.editDueTime.set(note.dueTime ?? '');
    this.editDuration.set(note.estimatedDurationMinutes?.toString() ?? '');
    this.editCategory.set(note.taskCategory ?? 'other');
    this.editAddingSubtask.set(false);
    this.editNewSubtaskTitle.set('');
  }

  protected closeEditModal(): void {
    this.editingNote.set(null);
  }

  protected async saveEdit(): Promise<void> {
    const note = this.editingNote();
    if (!note) return;
    const title = this.editTitle().trim();
    if (!title) return;
    this.editSaving.set(true);
    const durationStr = this.editDuration();
    const duration = durationStr ? Number(durationStr) : undefined;
    await this.dataStore.updateNote(note.id, {
      title,
      body: this.editBody().trim() || undefined,
      dueDate: this.editDueDate() || undefined,
      dueTime: this.editDueTime() || undefined,
      estimatedDurationMinutes: duration && duration > 0 ? duration : undefined,
      taskCategory: note.noteType !== 'reminder' ? this.editCategory() : undefined,
    });
    this.editSaving.set(false);
    this.closeEditModal();
  }

  protected async submitEditSubtask(parentId: string): Promise<void> {
    const title = this.editNewSubtaskTitle().trim();
    if (!title) return;
    await this.dataStore.addNote({ title, parentNoteId: parentId, subtaskStatus: 'not_started' });
    this.editAddingSubtask.set(false);
    this.editNewSubtaskTitle.set('');
  }

  protected async saveSubtaskTitle(sub: Note, newTitle: string): Promise<void> {
    const title = newTitle.trim();
    if (!title || title === sub.title) return;
    await this.dataStore.updateNote(sub.id, { title });
  }

  protected async openSharePanel(note: Note): Promise<void> {
    this.sharingNote.set(note);
    this.noteShareEmail.set('');
    this.noteSharePermission.set('collaborate');
    this.noteShareError.set(null);
    await this.dataStore.loadNoteShares();
  }

  protected closeSharePanel(): void {
    this.sharingNote.set(null);
  }

  protected async submitNoteShare(): Promise<void> {
    const email = this.noteShareEmail().trim();
    const note = this.sharingNote();
    if (!email || !note) return;
    this.noteShareSubmitting.set(true);
    this.noteShareError.set(null);
    try {
      await this.dataStore.grantNoteShare({ recipientEmail: email, noteId: note.id, permission: this.noteSharePermission() });
      this.noteShareEmail.set('');
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      this.noteShareError.set(status === 404 ? 'User not found' : 'Could not share — try again.');
    } finally {
      this.noteShareSubmitting.set(false);
    }
  }

  protected async revokeNoteShareFromPanel(shareId: string): Promise<void> {
    await this.dataStore.revokeNoteShare(shareId);
  }

  protected async submitNote(): Promise<void> {
    const title = this.newTitle().trim();
    if (!title) return;

    this.saving.set(true);
    const isReminder = this.isReminderCreateMode();
    const wantsScheduling = !isReminder && this.newWantsScheduling();
    const duration = !isReminder && this.newDuration() ? Number(this.newDuration()) : undefined;

    const created = await this.dataStore.addNote({
      title,
      body: this.newBody().trim() || undefined,
      noteType: this.createNoteType(),
      dueDate: this.newDueDate() || undefined,
      dueTime: isReminder ? undefined : this.newDueTime() || undefined,
      estimatedDurationMinutes: duration && duration > 0 ? duration : undefined,
      wantsScheduling,
      taskCategory: isReminder ? undefined : this.newCategory(),
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
    this.newCategory.set('other');
    this.formExpanded.set(false);
  }

  protected async toggleComplete(note: Note): Promise<void> {
    const wasCompleting = !note.completed;
    await this.dataStore.toggleNoteComplete(note.id, !note.completed);
    if (wasCompleting) {
      this.completingNoteId.set(note.id);
      setTimeout(() => this.completingNoteId.set(null), 350);
      this.maybeShowConfetti();
      this.checkBadgeEarned(note);
      void this.loadStreakData();
    }
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

  private async loadStreakData(): Promise<void> {
    try {
      const summary = await firstValueFrom(this.statsApi.getSummary());
      this.streakDays.set(summary.taskStreakDays);
      this.tasksCompletedTotal.set(summary.tasksCompletedTotal);
    } catch {
      // streak indicator is non-critical — silent failure is fine
    }
  }

  private maybeShowConfetti(): void {
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem('confetti_last_day') === today) return;
    localStorage.setItem('confetti_last_day', today);
    this.showConfetti.set(true);
    setTimeout(() => this.showConfetti.set(false), 900);
  }

  private checkBadgeEarned(justCompleted: Note): void {
    const completed = this.dataStore.notes().filter(
      n => n.noteType === 'task' && !n.parentNoteId && n.completed,
    );
    const total = completed.length;
    if (total === 1) { this.uiFeedback.show('Badge earned: First Step!'); return; }
    if (total === 100) { this.uiFeedback.show('Badge earned: Centurion!'); return; }
    const cat = justCompleted.taskCategory ?? 'other';
    if (cat === 'other') return;
    const catCount = completed.filter(n => n.taskCategory === cat).length;
    if (cat === 'quick_admin' && catCount === 10) { this.uiFeedback.show('Badge earned: Quick Wins!'); return; }
    if (cat === 'deep_work' && catCount === 5) { this.uiFeedback.show('Badge earned: Deep Diver!'); return; }
    if (cat === 'errand' && catCount === 10) { this.uiFeedback.show('Badge earned: Errand Runner!'); return; }
    const allCats = new Set(completed.map(n => n.taskCategory ?? 'other').filter(c => c !== 'other'));
    const prevCats = new Set(
      completed.filter(n => n.id !== justCompleted.id).map(n => n.taskCategory ?? 'other').filter(c => c !== 'other'),
    );
    if (allCats.size === 5 && prevCats.size === 4) { this.uiFeedback.show('Badge earned: Polymath!'); return; }
  }
}
