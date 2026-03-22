import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workout, WorkoutType } from './workout.entity';
import { CreateWorkoutDto, UpdateWorkoutDto } from './workout.dto';

@Injectable()
export class WorkoutService {
  constructor(
    @InjectRepository(Workout)
    private readonly workoutRepository: Repository<Workout>,
  ) {}

  async findAllByUser(userId: string): Promise<Workout[]> {
    return this.workoutRepository.find({ where: { userId } });
  }

  async findOne(id: string, userId: string): Promise<Workout> {
    const workout = await this.workoutRepository.findOne({
      where: { id, userId },
    });
    if (!workout) {
      throw new NotFoundException('Workout not found');
    }
    return workout;
  }

  async create(userId: string, dto: CreateWorkoutDto): Promise<Workout> {
    const workout = this.workoutRepository.create({
      ...dto,
      userId,
    });
    return this.workoutRepository.save(workout);
  }

  async update(id: string, userId: string, dto: UpdateWorkoutDto): Promise<Workout> {
    const workout = await this.findOne(id, userId);
    Object.assign(workout, dto);
    return this.workoutRepository.save(workout);
  }

  async remove(id: string, userId: string): Promise<void> {
    const workout = await this.findOne(id, userId);
    await this.workoutRepository.remove(workout);
  }
}
