import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkoutLog } from './workout-log.entity';
import { CreateWorkoutLogDto, UpdateWorkoutLogDto } from './workout-log.dto';

@Injectable()
export class WorkoutLogService {
  constructor(
    @InjectRepository(WorkoutLog)
    private readonly repo: Repository<WorkoutLog>,
  ) {}

  async create(userId: string, dto: CreateWorkoutLogDto): Promise<WorkoutLog> {
    const log = this.repo.create({
      ...dto,
      userId,
      completedAt: dto.completedAt ? new Date(dto.completedAt) : new Date(),
      endedEarly: dto.endedEarly ?? false,
    });
    return this.repo.save(log);
  }

  async findAllByUser(userId: string): Promise<WorkoutLog[]> {
    return this.repo.find({
      where: { userId },
      order: { completedAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<WorkoutLog> {
    const log = await this.repo.findOne({ where: { id, userId } });
    if (!log) throw new NotFoundException('Workout log not found');
    return log;
  }

  async findByPlannedSession(sessionId: string, userId: string): Promise<WorkoutLog | null> {
    return this.repo.findOne({ where: { plannedSessionId: sessionId, userId } });
  }

  async update(id: string, userId: string, dto: UpdateWorkoutLogDto): Promise<WorkoutLog> {
    const log = await this.findOne(id, userId);
    Object.assign(log, dto);
    return this.repo.save(log);
  }

  async remove(id: string, userId: string): Promise<void> {
    const log = await this.findOne(id, userId);
    await this.repo.remove(log);
  }
}
