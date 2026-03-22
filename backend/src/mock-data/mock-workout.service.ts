import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

export type WorkoutType = 'swimming' | 'running' | 'biking' | 'strength' | 'yoga';

export interface Workout {
  id: string;
  name: string;
  workoutType: WorkoutType;
  duration: number;
  frequencyPerWeek: number;
  distanceKm?: number;
  userId: string;
}

@Injectable()
export class MockWorkoutService {
  private workouts: Workout[] = [
    {
      id: 'workout-1',
      name: 'Morning Run',
      workoutType: 'running',
      duration: 45,
      frequencyPerWeek: 3,
      distanceKm: 5,
      userId: 'demo-user-id',
    },
    {
      id: 'workout-2',
      name: 'Strength Training',
      workoutType: 'strength',
      duration: 60,
      frequencyPerWeek: 2,
      userId: 'demo-user-id',
    },
    {
      id: 'workout-3',
      name: 'Yoga Session',
      workoutType: 'yoga',
      duration: 30,
      frequencyPerWeek: 2,
      userId: 'demo-user-id',
    },
  ];

  findAllByUser(userId: string): Workout[] {
    return this.workouts.filter((w) => w.userId === userId);
  }

  findOne(id: string, userId: string): Workout {
    const workout = this.workouts.find((w) => w.id === id && w.userId === userId);
    if (!workout) {
      throw new NotFoundException('Workout not found');
    }
    return workout;
  }

  create(userId: string, dto: Partial<Workout>): Workout {
    if (!dto.workoutType) {
      throw new Error('workoutType is required');
    }
    const workout: Workout = {
      id: uuidv4(),
      name: dto.name || 'New Workout',
      workoutType: dto.workoutType,
      duration: dto.duration || 60,
      frequencyPerWeek: dto.frequencyPerWeek || 1,
      distanceKm: dto.distanceKm,
      userId,
    };
    this.workouts.push(workout);
    return workout;
  }

  update(id: string, userId: string, dto: Partial<Workout>): Workout {
    const workout = this.findOne(id, userId);
    Object.assign(workout, dto);
    return workout;
  }

  remove(id: string, userId: string): void {
    const index = this.workouts.findIndex((w) => w.id === id && w.userId === userId);
    if (index === -1) {
      throw new NotFoundException('Workout not found');
    }
    this.workouts.splice(index, 1);
  }
}
