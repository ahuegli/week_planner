import { Injectable } from '@nestjs/common';

// Time utilities
export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

export function eventIntervals(event: any): { day: number; start: string; end: string }[] {
  // Handle overnight events
  if (event.endTime < event.startTime) {
    return [
      { day: event.day, start: event.startTime, end: '23:59' },
      { day: (event.day + 1) % 7, start: '00:00', end: event.endTime },
    ];
  }
  return [{ day: event.day, start: event.startTime, end: event.endTime }];
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

@Injectable()
export class ScoringEngineService {
  scoreSlot(event: any, shifts: any[], settings: any, weekContext: any): number {
    let score = 0;

    // Prefer earlier time slots
    const startMinutes = timeToMinutes(event.startTime);
    score += ((24 * 60 - startMinutes) / (24 * 60)) * 0.1;

    // Prefer days without other workouts (variety bonus)
    score += 0.2;

    return score;
  }

  getWorkoutValue(workout: any, settings: any): number {
    const enduranceTypes = ['swimming', 'running', 'biking'];
    if (enduranceTypes.includes(workout.workoutType)) {
      return settings.enduranceWeight / 100;
    }
    if (workout.workoutType === 'strength') {
      return settings.strengthWeight / 100;
    }
    if (workout.workoutType === 'yoga') {
      return settings.yogaWeight / 100;
    }
    return 0.3;
  }
}
