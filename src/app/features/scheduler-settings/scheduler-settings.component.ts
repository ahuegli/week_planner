import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DEFAULT_SETTINGS, PriorityItem, SchedulerSettings, WorkoutType, WorkoutTime, MealPrepSessions } from '../../core/models/scheduler-settings.model';
import { ShiftPattern, OnboardingData, ONBOARDING_LOCAL_STORAGE_KEY, DEFAULT_ONBOARDING_DATA } from '../../core/models/onboarding-data.model';
import { ShiftEditorModalComponent } from './shift-editor-modal.component';

@Component({
  selector: 'app-scheduler-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, CdkDropList, CdkDrag, CdkDragHandle, ShiftEditorModalComponent],
  templateUrl: './scheduler-settings.component.html',
  styleUrl: './scheduler-settings.component.scss',
})
export class SchedulerSettingsComponent {
  @Input() settings: SchedulerSettings = { ...DEFAULT_SETTINGS };
  @Output() settingsChanged = new EventEmitter<Partial<SchedulerSettings>>();
  @ViewChild(ShiftEditorModalComponent) shiftEditorModal!: ShiftEditorModalComponent;

  readonly priorityLabels: Record<PriorityItem, string> = {
    sport: 'Sport / Workouts',
    recovery: 'Recovery',
    mealprep: 'Meal Prep',
  };

  expandedThreshold: string | null = null;

  get onboardingInfo(): { workPattern: string; bedtime: string; wakeTime: string; shiftPatterns: ShiftPattern[] } | null {
    const raw = localStorage.getItem('weekPlanner_onboarding');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  toggleThreshold(sport: string): void {
    this.expandedThreshold = this.expandedThreshold === sport ? null : sport;
  }

  onChanged(): void {
    this.settingsChanged.emit({ ...this.settings });
  }

  onPriorityDrop(event: CdkDragDrop<PriorityItem[]>): void {
    moveItemInArray(
      this.settings.priorityHierarchy,
      event.previousIndex,
      event.currentIndex,
    );
    this.onChanged();
  }

  toggleWorkoutType(type: WorkoutType, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      if (!this.settings.workoutTypes.includes(type)) {
        this.settings.workoutTypes.push(type);
      }
    } else {
      this.settings.workoutTypes = this.settings.workoutTypes.filter(t => t !== type);
    }
    this.onChanged();
  }

  toggleWorkoutTime(time: WorkoutTime): void {
    if (this.settings.preferredWorkoutTimes.includes(time)) {
      this.settings.preferredWorkoutTimes = this.settings.preferredWorkoutTimes.filter(t => t !== time);
    } else {
      this.settings.preferredWorkoutTimes.push(time);
    }
    this.onChanged();
  }

  setMealPrepSessions(sessions: MealPrepSessions): void {
    this.settings.mealPrepSessionsPerWeek = sessions;
    this.onChanged();
  }

  openShiftEditor(): void {
    const info = this.onboardingInfo;
    this.shiftEditorModal.open({
      shiftPatterns: info?.shiftPatterns?.length ? info.shiftPatterns : DEFAULT_ONBOARDING_DATA.shiftPatterns,
      bedtime: info?.bedtime || DEFAULT_ONBOARDING_DATA.bedtime,
      wakeTime: info?.wakeTime || DEFAULT_ONBOARDING_DATA.wakeTime,
    });
  }

  onShiftEditorSave(data: { shiftPatterns: ShiftPattern[]; bedtime: string; wakeTime: string }): void {
    try {
      const raw = localStorage.getItem(ONBOARDING_LOCAL_STORAGE_KEY);
      const onboardingData: OnboardingData = raw
        ? { ...DEFAULT_ONBOARDING_DATA, ...JSON.parse(raw) }
        : { ...DEFAULT_ONBOARDING_DATA };

      onboardingData.shiftPatterns = data.shiftPatterns;
      onboardingData.bedtime = data.bedtime;
      onboardingData.wakeTime = data.wakeTime;
      localStorage.setItem(ONBOARDING_LOCAL_STORAGE_KEY, JSON.stringify(onboardingData));
    } catch (e) {
      console.error('Failed to update onboarding data:', e);
    }
  }

  getWorkPatternType(): 'fixed' | 'rotating' | 'irregular' {
    return (this.onboardingInfo?.workPattern as 'fixed' | 'rotating' | 'irregular') || 'fixed';
  }
}