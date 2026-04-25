import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeeklyProgress } from './weekly-progress.entity';
import { TrainingPlan } from '../training-plan/training-plan.entity';
import { UpsertWeeklyProgressDto } from './weekly-progress.dto';

@Injectable()
export class WeeklyProgressService {
  constructor(
    @InjectRepository(WeeklyProgress)
    private readonly progressRepository: Repository<WeeklyProgress>,
    @InjectRepository(TrainingPlan)
    private readonly planRepository: Repository<TrainingPlan>,
  ) {}

  async getAllByPlan(userId: string, planId: string): Promise<WeeklyProgress[]> {
    await this.ensurePlanOwnership(userId, planId);
    return this.progressRepository.find({
      where: { planId, userId },
      order: { weekNumber: 'ASC' },
    });
  }

  async getCurrentByPlan(userId: string, planId: string): Promise<WeeklyProgress | null> {
    const plan = await this.ensurePlanOwnership(userId, planId);
    return this.progressRepository.findOne({
      where: {
        planId,
        userId,
        weekNumber: plan.currentWeek,
      },
    });
  }

  async upsert(userId: string, planId: string, dto: UpsertWeeklyProgressDto): Promise<WeeklyProgress> {
    await this.ensurePlanOwnership(userId, planId);

    const existing = await this.progressRepository.findOne({
      where: {
        planId,
        userId,
        weekNumber: dto.weekNumber,
      },
    });

    if (existing) {
      Object.assign(existing, dto);
      return this.progressRepository.save(existing);
    }

    const created = this.progressRepository.create({
      planId,
      userId,
      ...dto,
      streakKeySessionsHit: dto.streakKeySessionsHit ?? 0,
      streakKeySessionsMissed: dto.streakKeySessionsMissed ?? 0,
    });
    return this.progressRepository.save(created);
  }

  private async ensurePlanOwnership(userId: string, planId: string): Promise<TrainingPlan> {
    const plan = await this.planRepository.findOne({
      where: { id: planId, userId },
    });

    if (!plan) {
      throw new NotFoundException('Training plan not found');
    }

    return plan;
  }
}
