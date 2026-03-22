import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShiftPattern, OnboardingData, ONBOARDING_LOCAL_STORAGE_KEY } from '../../core/models/onboarding-data.model';

@Component({
  selector: 'app-shift-editor-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen()) {
      <div class="modal-overlay" (click)="onCancel()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Edit Work Schedule & Sleep Times</h2>
            <button type="button" class="close-btn" (click)="onCancel()">✕</button>
          </div>

          <div class="modal-body">
            @if (workPattern === 'fixed') {
              <!-- Fixed Shift Editing -->
              <div class="shift-editor-fixed">
                <!-- Shift Name -->
                <div class="field-group">
                  <label class="field-label">Shift Name (optional)</label>
                  <input
                    type="text"
                    class="dark-input"
                    placeholder="e.g., Morning Shift, Evening Shift"
                    [(ngModel)]="currentShift.name"
                  />
                </div>

                <!-- Shift Times -->
                <div class="field-group">
                  <label class="field-label">Shift Times</label>
                  <div class="time-range">
                    <div class="time-input-wrapper">
                      <input
                        class="dark-input time-input"
                        type="time"
                        [(ngModel)]="currentShift.startTime"
                      />
                      <span class="clock-icon">🕐</span>
                    </div>
                    <span class="time-range-dash">—</span>
                    <div class="time-input-wrapper">
                      <input
                        class="dark-input time-input"
                        type="time"
                        [(ngModel)]="currentShift.endTime"
                      />
                      <span class="clock-icon">🕐</span>
                    </div>
                  </div>
                </div>

                <!-- Sleep Schedule -->
                <div class="field-group">
                  <label class="field-label">Sleep Schedule</label>
                  <div class="sleep-row">
                    <div class="sleep-col">
                      <span class="sub-label">Bedtime</span>
                      <div class="time-input-wrapper">
                        <input
                          class="dark-input time-input"
                          type="time"
                          [(ngModel)]="currentShift.bedtime"
                        />
                        <span class="clock-icon">🕐</span>
                      </div>
                    </div>
                    <div class="sleep-col">
                      <span class="sub-label">Wake time</span>
                      <div class="time-input-wrapper">
                        <input
                          class="dark-input time-input"
                          type="time"
                          [(ngModel)]="currentShift.wakeTime"
                        />
                        <span class="clock-icon">🕐</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            } @else if (workPattern === 'rotating') {
              <!-- Rotating Shifts Editing -->
              <div class="shift-editor-rotating">
                <p class=\"section-hint\">Create or edit your shift patterns</p>

                <!-- Add New Shift Section -->
                <div class="add-shift-section">
                  <div class="field-group">
                    <label class="field-label">Shift Name (optional)</label>
                    <input
                      type="text"
                      class="dark-input"
                      placeholder="e.g., Morning Shift"
                      [(ngModel)]="currentShift.name"
                    />
                  </div>

                  <div class="field-group">
                    <label class="field-label">Shift Times</label>
                    <div class="time-range">
                      <div class="time-input-wrapper">
                        <input
                          class="dark-input time-input"
                          type="time"
                          [(ngModel)]="currentShift.startTime"
                        />
                        <span class="clock-icon">🕐</span>
                      </div>
                      <span class="time-range-dash">—</span>
                      <div class="time-input-wrapper">
                        <input
                          class="dark-input time-input"
                          type="time"
                          [(ngModel)]="currentShift.endTime"
                        />
                        <span class="clock-icon">🕐</span>
                      </div>
                    </div>
                  </div>

                  <div class="field-group">
                    <label class="field-label">Days</label>
                    <div class="day-toggles">
                      @for (day of dayLabels; track $index) {
                        <button
                          type="button"
                          class="day-toggle"
                          [class.selected]="isShiftDaySelected($index)"
                          (click)="toggleShiftDay($index)"
                        >
                          {{ day }}
                        </button>
                      }
                    </div>
                  </div>

                  <div class="field-group">
                    <label class="field-label">Sleep Schedule for This Pattern</label>
                    <div class="sleep-row">
                      <div class="sleep-col">
                        <span class="sub-label">Bedtime</span>
                        <div class="time-input-wrapper">
                          <input
                            class="dark-input time-input"
                            type="time"
                            [(ngModel)]="currentShift.bedtime"
                          />
                          <span class="clock-icon">🕐</span>
                        </div>
                      </div>
                      <div class="sleep-col">
                        <span class="sub-label">Wake time</span>
                        <div class="time-input-wrapper">
                          <input
                            class="dark-input time-input"
                            type="time"
                            [(ngModel)]="currentShift.wakeTime"
                          />
                          <span class="clock-icon">🕐</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="shift-action-buttons">
                    @if (currentShift.daysOfWeek.length > 0) {
                      <button
                        type="button"
                        class="btn-secondary btn-full"
                        (click)="addShiftPattern()"
                      >
                        @if (editingIndex() !== null) {
                          ✓ Update Shift
                        } @else {
                          + Add More Shifts
                        }
                      </button>
                    }
                    @if (editingIndex() !== null) {
                      <button
                        type="button"
                        class="btn-secondary btn-full cancel-btn"
                        (click)="cancelEdit()"
                      >
                        Cancel
                      </button>
                    }
                  </div>
                </div>

                <!-- Existing Shifts List -->
                @if (shiftPatterns.length > 0) {
                  <div class="patterns-list">
                    <label class="field-label">Your Shifts</label>
                    @for (pattern of shiftPatterns; track $index) {
                      <div class=\"pattern-item\" [class.editing]=\"editingIndex() === $index\">
                        <div class="pattern-content">
                          <div class="pattern-name">
                            {{ pattern.name || 'Shift ' + ($index + 1) }}
                          </div>
                          <div class="pattern-times">
                            {{ pattern.startTime }}–{{ pattern.endTime }}
                          </div>
                          <div class="pattern-days">
                            {{ pattern.daysOfWeek.map(d => dayLabels[d]).join(', ') }}
                          </div>
                          @if (pattern.bedtime && pattern.wakeTime) {
                            <div class="pattern-sleep">
                              Sleep: {{ formatTime12(pattern.bedtime) }}–{{ formatTime12(pattern.wakeTime) }}
                            </div>
                          }
                        </div>
                        <div class="pattern-actions">
                          <button
                            type="button"
                            class="btn-icon edit-btn"
                            (click)="editShiftPattern($index)"
                            title="Edit this shift"
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            class="btn-icon"
                            (click)="removeShiftPattern($index)"
                            title="Remove this shift"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-secondary" (click)="onCancel()">Cancel</button>
            <button type="button" class="btn-primary" (click)="onSave()">Save Changes</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease-out;
    }

    .modal-content {
      background: var(--color-bg-primary);
      border-radius: var(--radius-lg);
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: var(--shadow-lg);
      animation: slideUp 0.3s ease-out;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-lg) var(--spacing-lg) var(--spacing-md);
      border-bottom: 1px solid var(--color-border-light);

      h2 {
        margin: 0;
        font-size: var(--font-size-h2);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-primary);
      }

      .close-btn {
        background: transparent;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: var(--color-text-secondary);
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: var(--transition-default);

        &:hover {
          color: var(--color-text-primary);
        }
      }
    }

    .modal-body {
      padding: var(--spacing-lg);
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .modal-footer {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-md);
      padding: var(--spacing-lg);
      border-top: 1px solid var(--color-border-light);
      background: var(--color-bg-secondary);
    }

    .field-group {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
    }

    .field-label {
      font-size: var(--font-size-label);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .dark-input {
      padding: 10px 12px;
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md);
      font-size: var(--font-size-body);
      background: var(--color-surface);
      color: var(--color-text-primary);
      transition: var(--transition-default);

      &:focus {
        outline: none;
        border-color: var(--color-primary-green);
        box-shadow: 0 0 0 3px rgba(95, 178, 149, 0.1);
      }

      &::placeholder {
        color: var(--color-text-tertiary);
      }
    }

    .time-input {
      flex: 1;
    }

    .time-range {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }

    .time-input-wrapper {
      flex: 1;
      position: relative;
      display: flex;
      align-items: center;

      .clock-icon {
        position: absolute;
        right: 10px;
        pointer-events: none;
        opacity: 0.5;
      }

      .dark-input {
        padding-right: 36px;
      }
    }

    .time-range-dash {
      color: var(--color-text-secondary);
      font-weight: var(--font-weight-semibold);
    }

    .sleep-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-md);
    }

    .sleep-col {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);

      .sub-label {
        font-size: var(--font-size-small);
        color: var(--color-text-secondary);
        font-weight: var(--font-weight-semibold);
      }
    }

    .day-toggles {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: var(--spacing-xs);
    }

    .day-toggle {
      padding: 10px 8px;
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-text-primary);
      font-weight: var(--font-weight-semibold);
      cursor: pointer;
      transition: var(--transition-default);

      &:hover {
        border-color: var(--color-primary-green);
      }

      &.selected {
        background: var(--color-primary-green);
        border-color: var(--color-primary-green);
        color: white;
      }
    }

    .btn-secondary,
    .btn-primary {
      padding: 12px 24px;
      border: none;
      border-radius: var(--radius-md);
      font-size: var(--font-size-body);
      font-weight: var(--font-weight-semibold);
      cursor: pointer;
      transition: var(--transition-default);
    }

    .btn-secondary {
      background: var(--color-bg-secondary);
      color: var(--color-text-primary);
      border: 1px solid var(--color-border-light);

      &:hover {
        background: var(--color-bg-tertiary);
        border-color: var(--color-border-medium);
      }
    }

    .btn-primary {
      background: var(--color-primary-green);
      color: white;

      &:hover {
        background: var(--color-primary-green-dark);
      }
    }

    .btn-full {
      width: 100%;
    }

    .shift-action-buttons {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .cancel-btn {
      background: rgba(220, 53, 69, 0.1) !important;
      color: var(--color-text-primary) !important;
      border-color: rgba(220, 53, 69, 0.3) !important;

      &:hover {
        background: rgba(220, 53, 69, 0.2) !important;
        border-color: rgba(220, 53, 69, 0.5) !important;
      }
    }

    .btn-icon {
      background: transparent;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: var(--color-text-secondary);
      padding: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: var(--transition-default);

      &:hover {
        color: var(--color-text-primary);
      }
    }

    .section-hint {
      font-size: var(--font-size-small);
      color: var(--color-text-secondary);
      margin: 0 0 var(--spacing-md);
    }

    .add-shift-section {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
      padding: var(--spacing-md);
      background: rgba(95, 178, 149, 0.05);
      border: 1px solid rgba(95, 178, 149, 0.15);
      border-radius: var(--radius-md);
    }

    .patterns-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);

      .field-label {
        margin-bottom: var(--spacing-xs);
      }
    }

    .pattern-item {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: var(--spacing-md);
      background: var(--color-surface);
      border: 1px solid var(--color-border-light);
      border-radius: var(--radius-md);
      gap: var(--spacing-md);
      transition: all var(--transition-default);

      &.editing {
        background: rgba(95, 178, 149, 0.1);
        border-color: var(--color-primary-green);
      }
    }

    .pattern-content {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
      flex: 1;
    }

    .pattern-name {
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
      font-size: var(--font-size-body);
    }

    .pattern-times {
      color: var(--color-text-secondary);
      font-size: var(--font-size-small);
    }

    .pattern-days {
      color: var(--color-text-secondary);
      font-size: var(--font-size-small);
    }

    .pattern-sleep {
      color: var(--color-primary-green);
      font-size: var(--font-size-small);
      font-weight: var(--font-weight-semibold);
    }

    .pattern-actions {
      display: flex;
      gap: var(--spacing-sm);
      align-items: center;
    }

    .btn-icon.edit-btn {
      color: var(--color-primary-green);

      &:hover {
        color: var(--color-primary-green-dark);
      }
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes slideUp {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  `],
})
export class ShiftEditorModalComponent {
  @Input() workPattern: 'fixed' | 'rotating' | 'irregular' = 'fixed';
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<{ shiftPatterns: ShiftPattern[]; bedtime: string; wakeTime: string }>();

  isOpen = signal(false);
  readonly dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  editingIndex = signal<number | null>(null);

  shiftPatterns: ShiftPattern[] = [];
  currentShift: ShiftPattern = {
    startTime: '08:00',
    endTime: '17:00',
    daysOfWeek: [],
    bedtime: '23:00',
    wakeTime: '07:00',
  };

  open(data: { shiftPatterns: ShiftPattern[]; bedtime: string; wakeTime: string }): void {
    this.shiftPatterns = [...data.shiftPatterns.map(p => ({ ...p }))];
    this.currentShift = {
      startTime: '08:00',
      endTime: '17:00',
      daysOfWeek: [],
      bedtime: data.bedtime,
      wakeTime: data.wakeTime,
    };
    this.isOpen.set(true);
  }

  toggleShiftDay(dayIndex: number): void {
    const idx = this.currentShift.daysOfWeek.indexOf(dayIndex);
    if (idx === -1) {
      this.currentShift.daysOfWeek = [...this.currentShift.daysOfWeek, dayIndex].sort((a, b) => a - b);
    } else {
      this.currentShift.daysOfWeek = this.currentShift.daysOfWeek.filter((d) => d !== dayIndex);
    }
  }

  isShiftDaySelected(dayIndex: number): boolean {
    return this.currentShift.daysOfWeek.includes(dayIndex);
  }

  addShiftPattern(): void {
    const editIdx = this.editingIndex();
    if (editIdx !== null) {
      // Update existing shift
      this.shiftPatterns[editIdx] = { ...this.currentShift };
      this.editingIndex.set(null);
    } else {
      // Add new shift
      this.shiftPatterns = [...this.shiftPatterns, { ...this.currentShift }];
    }
    
    // Reset form
    this.currentShift = {
      startTime: '08:00',
      endTime: '17:00',
      daysOfWeek: [],
      bedtime: this.currentShift.bedtime,
      wakeTime: this.currentShift.wakeTime,
    };
  }

  editShiftPattern(index: number): void {
    this.currentShift = { ...this.shiftPatterns[index] };
    this.editingIndex.set(index);
  }

  cancelEdit(): void {
    this.editingIndex.set(null);
    this.currentShift = {
      startTime: '08:00',
      endTime: '17:00',
      daysOfWeek: [],
      bedtime: this.currentShift.bedtime,
      wakeTime: this.currentShift.wakeTime,
    };
  }

  removeShiftPattern(index: number): void {
    this.shiftPatterns = this.shiftPatterns.filter((_, i) => i !== index);
  }

  formatTime12(time: string): string {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const m = minutes;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  }

  onCancel(): void {
    this.isOpen.set(false);
    this.close.emit();
  }

  onSave(): void {
    let bedtime = this.currentShift.bedtime || '23:00';
    let wakeTime = this.currentShift.wakeTime || '07:00';

    if (this.workPattern === 'rotating' && this.shiftPatterns.length > 0) {
      bedtime = this.shiftPatterns[0]?.bedtime || bedtime;
      wakeTime = this.shiftPatterns[0]?.wakeTime || wakeTime;
    }

    this.save.emit({
      shiftPatterns: this.workPattern === 'rotating' ? this.shiftPatterns : [this.currentShift],
      bedtime,
      wakeTime,
    });
    this.isOpen.set(false);
  }
}
