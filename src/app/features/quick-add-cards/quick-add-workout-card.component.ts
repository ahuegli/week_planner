import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkoutType, ENDURANCE_TYPES } from '../../core/models/workout.model';
import { WorkoutPreset } from '../../core/models/workout-preset.model';

@Component({
  selector: 'app-quick-add-workout-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quick-add-workout-card.component.html',
  styleUrl: './quick-add-workout-card.component.scss',
})
export class QuickAddWorkoutCardComponent implements OnChanges {
  private readonly addMorePresetsOptionValue = '__add_more_presets__';
  @Input() presetDay: number | null = null;
  @Input() presetDayLabel = '';
  @Input() presetWeekOffset = 0;
  @Input() availablePresets: WorkoutPreset[] = [];

  @Output() workoutAdded = new EventEmitter<
    | {
        kind: 'new';
        type: WorkoutType;
        sessionName: string;
        duration: number;
        timeframe: number;
        distance?: number;
        notes?: string;
        saveAsPreset: boolean;
      }
    | {
        kind: 'preset';
        presetId: string;
        timeframe: number;
        notes?: string;
      }
    | {
        kind: 'new-planned';
        day: number;
        weekOffset: number;
        startTime: string;
        type: WorkoutType;
        sessionName: string;
        duration: number;
        distance?: number;
        notes?: string;
        saveAsPreset: boolean;
      }
    | {
        kind: 'preset-planned';
        day: number;
        weekOffset: number;
        startTime: string;
        presetId: string;
        notes?: string;
      }
  >();

  @Output() closed = new EventEmitter<void>();
  @Output() presetUpdated = new EventEmitter<{
    id: string;
    name: string;
    workoutType: WorkoutType;
    duration: number;
    distanceKm?: number;
    notes?: string;
  }>();
  @Output() presetDeleted = new EventEmitter<string>();

  // Use individual signals for better reactivity with ngModel
  type = signal<WorkoutType>('strength');
  sessionName = signal('');
  duration = signal(45);
  timeframe = signal(1);
  startTime = signal('18:00');
  distance = signal<number | undefined>(undefined);
  notes = signal('');
  mode = signal<'new' | 'preset'>('new');
  saveAsPreset = signal(false);
  selectedPresetId = signal('');
  presetName = signal('');
  presetType = signal<WorkoutType>('running');
  presetDuration = signal(45);
  presetDistance = signal<number | undefined>(undefined);
  presetNotes = signal('');
  showPresetEditDialog = signal(false);

  // Must match the order and count matching to the actual WorkoutType
  workoutTypes: { label: string; value: WorkoutType }[] = [
    { label: 'Running', value: 'running' },
    { label: 'Swimming', value: 'swimming' },
    { label: 'Biking', value: 'biking' },
    { label: 'Strength', value: 'strength' },
    { label: 'Yoga', value: 'yoga' },
  ];

  timeframeOptions = [
    { label: 'Once', value: 1 },
    { label: '2x/week', value: 2 },
    { label: '3x/week', value: 3 },
    { label: '4x/week', value: 4 },
    { label: '5x/week', value: 5 },
    { label: '6x/week', value: 6 },
    { label: '7x/week', value: 7 },
  ];

  isEnduranceType(): boolean {
    return ENDURANCE_TYPES.includes(this.type());
  }

  get selectedPreset(): WorkoutPreset | undefined {
    return this.availablePresets.find((preset) => preset.id === this.selectedPresetId());
  }

  selectMode(mode: 'new' | 'preset'): void {
    this.mode.set(mode);

    if (mode === 'preset' && !this.selectedPresetId() && this.availablePresets.length > 0) {
      this.selectedPresetId.set(this.availablePresets[0].id);
    }

    if (mode === 'preset') {
      this.notes.set(this.selectedPreset?.notes || '');
      return;
    }

    this.notes.set('');
  }

  isMonthlyPlanning(): boolean {
    return this.presetDay !== null;
  }

  isPresetEnduranceType(): boolean {
    return ENDURANCE_TYPES.includes(this.presetType());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['availablePresets']) {
      return;
    }

    const selectedId = this.selectedPresetId();
    const hasSelectedPreset = this.availablePresets.some((preset) => preset.id === selectedId);

    if (!hasSelectedPreset) {
      this.selectedPresetId.set(this.availablePresets[0]?.id ?? '');
    }

    this.syncPresetEditorFromSelected();
  }

  onAdd(): void {
    const isMonthlyPlanning = this.isMonthlyPlanning();

    if (this.mode() === 'preset') {
      if (!this.selectedPresetId()) {
        return;
      }

      if (isMonthlyPlanning && this.presetDay !== null) {
        this.workoutAdded.emit({
          kind: 'preset-planned',
          day: this.presetDay,
          weekOffset: this.presetWeekOffset,
          startTime: this.startTime(),
          presetId: this.selectedPresetId(),
          notes: this.notes().trim() || undefined,
        });
        this.resetForm();
        return;
      }

      this.workoutAdded.emit({
        kind: 'preset',
        presetId: this.selectedPresetId(),
        timeframe: this.timeframe(),
        notes: this.notes().trim() || undefined,
      });
      this.resetForm();
      return;
    }

    if (this.sessionName().trim()) {
      if (isMonthlyPlanning && this.presetDay !== null) {
        this.workoutAdded.emit({
          kind: 'new-planned',
          day: this.presetDay,
          weekOffset: this.presetWeekOffset,
          startTime: this.startTime(),
          type: this.type(),
          sessionName: this.sessionName().trim(),
          duration: this.duration(),
          distance: this.distance(),
          notes: this.notes().trim() || undefined,
          saveAsPreset: this.saveAsPreset(),
        });
        this.resetForm();
        return;
      }

      this.workoutAdded.emit({
        kind: 'new',
        type: this.type(),
        sessionName: this.sessionName().trim(),
        duration: this.duration(),
        timeframe: this.timeframe(),
        distance: this.distance(),
        notes: this.notes().trim() || undefined,
        saveAsPreset: this.saveAsPreset(),
      });
      this.resetForm();
    }
  }

  onCancel(): void {
    this.resetForm();
    this.showPresetEditDialog.set(false);
    this.closed.emit();
  }

  onPresetSelected(presetId: string): void {
    if (presetId === this.addMorePresetsOptionValue) {
      this.selectMode('new');
      this.saveAsPreset.set(true);
      return;
    }

    this.selectedPresetId.set(presetId);
    this.syncPresetEditorFromSelected();
    this.notes.set(this.selectedPreset?.notes || '');
  }

  onSavePresetChanges(): void {
    const presetId = this.selectedPresetId();
    if (!presetId || !this.presetName().trim() || this.presetDuration() <= 0) {
      return;
    }

    this.presetUpdated.emit({
      id: presetId,
      name: this.presetName().trim(),
      workoutType: this.presetType(),
      duration: this.presetDuration(),
      distanceKm: this.presetDistance(),
      notes: this.presetNotes().trim() || undefined,
    });
    this.showPresetEditDialog.set(false);
  }

  onDeletePreset(): void {
    const presetId = this.selectedPresetId();
    if (!presetId) {
      return;
    }

    this.presetDeleted.emit(presetId);
    this.showPresetEditDialog.set(false);
  }

  openPresetEditor(): void {
    if (!this.selectedPreset) {
      return;
    }
    this.showPresetEditDialog.set(true);
  }

  closePresetEditor(): void {
    this.showPresetEditDialog.set(false);
    this.syncPresetEditorFromSelected();
  }

  private resetForm(): void {
    this.type.set('strength');
    this.sessionName.set('');
    this.duration.set(45);
    this.timeframe.set(1);
    this.startTime.set('18:00');
    this.distance.set(undefined);
    this.notes.set('');
    this.mode.set('new');
    this.saveAsPreset.set(false);
    this.selectedPresetId.set(this.availablePresets[0]?.id ?? '');
    this.showPresetEditDialog.set(false);
    this.syncPresetEditorFromSelected();
  }

  private syncPresetEditorFromSelected(): void {
    const preset = this.availablePresets.find((item) => item.id === this.selectedPresetId());

    if (!preset) {
      this.presetName.set('');
      this.presetType.set('running');
      this.presetDuration.set(45);
      this.presetDistance.set(undefined);
      this.presetNotes.set('');
      return;
    }

    this.presetName.set(preset.name);
    this.presetType.set(preset.workoutType);
    this.presetDuration.set(preset.duration);
    this.presetDistance.set(preset.distanceKm);
    this.presetNotes.set(preset.notes || '');

    if (this.mode() === 'preset') {
      this.notes.set(preset.notes || '');
    }
  }
}
