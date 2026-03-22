import { Injectable, inject } from '@angular/core';
import { PlannerService } from './planner.service';
import {
  DEFAULT_ONBOARDING_DATA,
  OnboardingData,
  ONBOARDING_LOCAL_STORAGE_KEY,
} from '../models/onboarding-data.model';
import { WorkoutType as PreferenceWorkoutType } from '../models/scheduler-settings.model';
import { WorkoutType } from '../models/workout.model';

export interface SuggestedWorkout {
  day: number;
  workoutType: WorkoutType;
  title: string;
  duration: number;
  distance?: number;
  startMinutes: number;
}

/**
 * Service responsible for workout scheduling algorithms.
 * Single Responsibility: Generate workout suggestions based on preferences and constraints.
 */
@Injectable({ providedIn: 'root' })
export class WorkoutSchedulerService {
  private readonly planner = inject(PlannerService);

  /**
   * Generate suggested workouts for a week based on user preferences
   */
  generateSuggestedWorkouts(weekOffset: number): SuggestedWorkout[] {
    const onboarding = this.getOnboardingData();
    const selectedTypes = this.getPreferredWorkoutTypes(onboarding);
    const weeklyTarget = Math.max(1, this.settingsTargetOrOnboarding(onboarding));

    const workoutSequence = this.buildWorkoutSequence(selectedTypes, weeklyTarget);
    const timeSequence = this.buildPreferredTimeSequence(onboarding);

    return workoutSequence.map((workoutType, index) => {
      const day = index % 7;
      const startTime = timeSequence[index % timeSequence.length];
      const startMinutes = this.getWorkoutStartWithCommuteBuffer(
        day,
        this.timeToMinutes(startTime),
        weekOffset,
      );

      return {
        day,
        workoutType,
        title: `${this.getWorkoutLabel(workoutType)} (suggested)`,
        duration: this.getDefaultDuration(workoutType),
        distance: this.getDefaultDistance(workoutType),
        startMinutes,
      };
    });
  }

  /**
   * Get workout label for display
   */
  getWorkoutLabel(type: WorkoutType): string {
    switch (type) {
      case 'running':
        return 'Running';
      case 'biking':
        return 'Biking';
      case 'swimming':
        return 'Swimming';
      case 'yoga':
        return 'Yoga';
      default:
        return 'Strength';
    }
  }

  /**
   * Get default duration for workout type
   */
  getDefaultDuration(type: WorkoutType): number {
    switch (type) {
      case 'running':
        return 45;
      case 'biking':
        return 60;
      case 'swimming':
        return 60;
      case 'yoga':
        return 40;
      default:
        return 50;
    }
  }

  /**
   * Get default distance for workout type (if applicable)
   */
  getDefaultDistance(type: WorkoutType): number | undefined {
    switch (type) {
      case 'running':
        return 5;
      case 'biking':
        return 20;
      case 'swimming':
        return 2;
      default:
        return undefined;
    }
  }

  private getOnboardingData(): OnboardingData {
    try {
      const raw = localStorage.getItem(ONBOARDING_LOCAL_STORAGE_KEY);
      return raw
        ? { ...DEFAULT_ONBOARDING_DATA, ...JSON.parse(raw) }
        : { ...DEFAULT_ONBOARDING_DATA };
    } catch {
      return { ...DEFAULT_ONBOARDING_DATA };
    }
  }

  private settingsTargetOrOnboarding(onboarding: OnboardingData): number {
    return this.planner.settings().weeklyWorkoutsTarget || onboarding.targetWorkoutsPerWeek;
  }

  private getPreferredWorkoutTypes(onboarding: OnboardingData): PreferenceWorkoutType[] {
    const settingsTypes = this.planner.settings().workoutTypes;
    if (settingsTypes?.length) {
      return settingsTypes;
    }

    const mapped = onboarding.favoriteWorkouts
      .map((type) => {
        if (type === 'strength') return 'strength';
        if (type === 'cardio') return 'cardio';
        if (type === 'flexibility') return 'flexibility';
        if (type === 'recovery') return 'recovery';
        return null;
      })
      .filter((type): type is PreferenceWorkoutType => !!type);

    return mapped.length ? mapped : ['strength', 'cardio'];
  }

  private buildWorkoutSequence(types: PreferenceWorkoutType[], target: number): WorkoutType[] {
    const mapType = (type: PreferenceWorkoutType): WorkoutType => {
      if (type === 'cardio') return 'running';
      if (type === 'flexibility') return 'yoga';
      if (type === 'recovery') return 'yoga';
      return 'strength';
    };

    const sequence: WorkoutType[] = [];
    types.forEach((type) => sequence.push(mapType(type)));

    const fallback: WorkoutType[] = ['strength', 'running'];
    let fallbackIndex = 0;

    while (sequence.length < target) {
      sequence.push(fallback[fallbackIndex % fallback.length]);
      fallbackIndex += 1;
    }

    return sequence.slice(0, target);
  }

  private buildPreferredTimeSequence(onboarding: OnboardingData): string[] {
    const preferred = this.planner.settings().preferredWorkoutTimes?.length
      ? this.planner.settings().preferredWorkoutTimes
      : onboarding.preferredWorkoutTimes;

    const mapped = preferred.map((slot) => {
      if (slot === 'early') return '07:00';
      if (slot === 'evening') return '18:00';
      return '12:00';
    });

    return mapped.length ? mapped : ['18:00'];
  }

  private timeToMinutes(value: string): number {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private getWorkoutStartWithCommuteBuffer(
    day: number,
    preferredStart: number,
    weekOffset: number,
  ): number {
    const shifts = this.planner
      .events()
      .filter(
        (event) =>
          event.type === 'shift' &&
          event.day === day &&
          (event.weekOffset === undefined || event.weekOffset === weekOffset),
      );

    if (shifts.length === 0) {
      return preferredStart;
    }

    const latestBlockedEnd = shifts.reduce((max, shift) => {
      const end = this.timeToMinutes(shift.endTime);
      const commute = shift.commuteMinutes || 0;
      return Math.max(max, end + commute);
    }, 0);

    const adjusted = Math.max(preferredStart, latestBlockedEnd);
    const snapped = Math.ceil(adjusted / 30) * 30;
    return Math.min(snapped, 23 * 60 + 30);
  }
}
