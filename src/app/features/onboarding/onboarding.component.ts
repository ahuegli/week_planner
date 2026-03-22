import { Component, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  OnboardingData,
  DEFAULT_ONBOARDING_DATA,
  ONBOARDING_LOCAL_STORAGE_KEY,
  RecoveryGap,
  RestDaysPerWeek,
  ShiftPattern,
} from '../../core/models/onboarding-data.model';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.scss',
})
export class OnboardingComponent {
  readonly totalSteps = 4;
  readonly dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  currentStep = signal(1);

  @Output() navigateToWeek = new EventEmitter<void>();

  data: OnboardingData = this.loadSavedData();

  // Temporary shift pattern being edited (for fixed/rotating)
  currentShift: ShiftPattern = {
    startTime: '08:00',
    endTime: '17:00',
    daysOfWeek: [0, 1, 2, 3, 4],
    bedtime: '23:00',
    wakeTime: '07:00',
  };

  // -------------------------------------------------- step helpers
  get progressDots(): number[] {
    return Array.from({ length: this.totalSteps }, (_, i) => i + 1);
  }

  nextStep(): void {
    if (this.currentStep() < this.totalSteps) {
      this.currentStep.update((s) => s + 1);
    }
  }

  prevStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update((s) => s - 1);
    }
  }

  skipStep(): void {
    this.nextStep();
  }

  // -------------------------------------------------- shift pattern management
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
    this.data.shiftPatterns = [...this.data.shiftPatterns, { ...this.currentShift }];
    // Reset for next pattern
    this.currentShift = {
      startTime: '08:00',
      endTime: '17:00',
      daysOfWeek: [],
      bedtime: '23:00',
      wakeTime: '07:00',
    };
  }

  removeShiftPattern(index: number): void {
    this.data.shiftPatterns = this.data.shiftPatterns.filter((_, i) => i !== index);
  }

  // -------------------------------------------------- workout toggles
  toggleWorkout(type: string): void {
    const idx = this.data.favoriteWorkouts.indexOf(type);
    if (idx === -1) {
      this.data.favoriteWorkouts = [...this.data.favoriteWorkouts, type];
    } else {
      this.data.favoriteWorkouts = this.data.favoriteWorkouts.filter((w) => w !== type);
    }
  }

  isWorkoutSelected(type: string): boolean {
    return this.data.favoriteWorkouts.includes(type);
  }

  // -------------------------------------------------- workout time toggles
  toggleWorkoutTime(time: string): void {
    const idx = this.data.preferredWorkoutTimes.indexOf(time);
    if (idx === -1) {
      this.data.preferredWorkoutTimes = [...this.data.preferredWorkoutTimes, time];
    } else {
      this.data.preferredWorkoutTimes = this.data.preferredWorkoutTimes.filter((t) => t !== time);
    }
  }

  isWorkoutTimeSelected(time: string): boolean {
    return this.data.preferredWorkoutTimes.includes(time);
  }

  // -------------------------------------------------- setters for form fields
  setRecoveryGap(value: any): void {
    this.data.recoveryBetweenStrength = value as RecoveryGap;
  }

  setRestDays(value: any): void {
    this.data.restDaysPerWeek = value as RestDaysPerWeek;
  }

  // -------------------------------------------------- confirmation summary helpers
  get workScheduleSummary(): string {
    if (this.data.workPattern === 'irregular') {
      return 'Irregular schedule - to be input in calendar';
    }

    const patterns = this.data.shiftPatterns;
    if (patterns.length === 0) return 'No shifts defined';

    const patternLabels = patterns.map((p) => {
      const days = p.daysOfWeek.map((d) => this.dayLabels[d]).join(', ');
      return `${days}: ${p.startTime}-${p.endTime}`;
    });

    return patternLabels.join(' | ');
  }

  get sleepSummary(): string {
    return `Sleep: ${this.formatTime12(this.data.bedtime)} - ${this.formatTime12(this.data.wakeTime)}`;
  }

  get workoutsSummary(): string {
    const labels: Record<string, string> = {
      strength: 'Strength',
      cardio: 'Cardio',
      flexibility: 'Flexibility',
      recovery: 'Recovery',
    };
    const types = this.data.favoriteWorkouts.map((w) => labels[w] ?? w).join(', ');
    return `${this.data.targetWorkoutsPerWeek} workouts/week`;
  }

  get workoutsTypesSummary(): string {
    const labels: Record<string, string> = {
      strength: 'Strength',
      cardio: 'Cardio',
      flexibility: 'Flexibility',
      recovery: 'Recovery',
    };
    return this.data.favoriteWorkouts.map((w) => labels[w] ?? w).join(', ');
  }

  get recoverySummary(): string {
    return `${this.data.recoveryBetweenStrength}h between strength, ${this.data.restDaysPerWeek} rest days`;
  }

  get sleepIntenseSummary(): string {
    return `Min ${this.data.minSleepBeforeIntense}h sleep before intense workouts`;
  }

  // -------------------------------------------------- finish actions
  generateFirstWeek(): void {
    this.saveData();
    // TODO: hook into PlannerService to:
    // 1. Create shift events (locked) for the month
    // 2. Generate the week schedule
    // 3. Navigate to week view
    this.navigateToWeek.emit();
  }

  editSettings(): void {
    this.currentStep.set(1);
  }

  skipForNow(): void {
    this.saveData();
  }

  // -------------------------------------------------- persistence
  private saveData(): void {
    try {
      localStorage.setItem(ONBOARDING_LOCAL_STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // localStorage unavailable – silently ignore
    }
  }

  private loadSavedData(): OnboardingData {
    try {
      const raw = localStorage.getItem(ONBOARDING_LOCAL_STORAGE_KEY);
      if (raw) {
        return { ...DEFAULT_ONBOARDING_DATA, ...JSON.parse(raw) };
      }
    } catch {
      // ignore
    }
    return { ...DEFAULT_ONBOARDING_DATA };
  }

  // -------------------------------------------------- util
  formatTime12(time24: string): string {
    if (!time24) return '';
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m.toString().padStart(2, '0')} ${period}`;
  }
}
