import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrainingPlan } from './training-plan.entity';
import { PlanWeek } from '../plan-week/plan-week.entity';
import { CreateTrainingPlanDto, UpdateTrainingPlanDto } from './training-plan.dto';
import { PlannedSession } from '../planned-session/planned-session.entity';
import { SchedulerSettingsService } from '../scheduler-settings/scheduler-settings.service';
import { PlanTemplateService } from '../domain/plan-template.service';

@Injectable()
export class TrainingPlanService {
  constructor(
    @InjectRepository(TrainingPlan)
    private readonly planRepository: Repository<TrainingPlan>,
    @InjectRepository(PlanWeek)
    private readonly planWeekRepository: Repository<PlanWeek>,
    private readonly schedulerSettingsService: SchedulerSettingsService,
    private readonly planTemplateService: PlanTemplateService,
  ) {}

  async create(userId: string, dto: CreateTrainingPlanDto): Promise<TrainingPlan> {
    const plan = this.planRepository.create({
      ...dto,
      userId,
      currentWeek: dto.currentWeek ?? 1,
      status: dto.status ?? 'active',
    });
    return this.planRepository.save(plan);
  }

  async findAllByUser(userId: string): Promise<TrainingPlan[]> {
    return this.planRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOneByUser(id: string, userId: string): Promise<TrainingPlan> {
    const plan = await this.planRepository.findOne({
      where: { id, userId },
      relations: {
        weeks: {
          sessions: true,
        },
      },
      order: {
        weeks: {
          weekNumber: 'ASC',
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Training plan not found');
    }

    return plan;
  }

  async update(id: string, userId: string, dto: UpdateTrainingPlanDto): Promise<TrainingPlan> {
    const plan = await this.findOneByUser(id, userId);
    Object.assign(plan, dto);
    return this.planRepository.save(plan);
  }

  async remove(id: string, userId: string): Promise<void> {
    const plan = await this.findOneByUser(id, userId);
    await this.planRepository.remove(plan);
  }

  async generatePlanTemplate(planId: string, userId: string): Promise<TrainingPlan> {
    const plan = await this.ensurePlanOwnership(planId, userId);
    const settings = await this.schedulerSettingsService.findByUser(userId);
    const generated = this.planTemplateService.generateWeeksAndSessions(plan, settings);

    await this.planRepository.manager.transaction(async (manager) => {
      const weekRepository = manager.getRepository(PlanWeek);
      const sessionRepository = manager.getRepository(PlannedSession);

      await sessionRepository
        .createQueryBuilder()
        .delete()
        .from(PlannedSession)
        .where('"planWeekId" IN (SELECT id FROM plan_weeks WHERE "planId" = :planId)', { planId })
        .execute();

      await weekRepository.delete({ planId });

      const weekEntities = generated.weeks.map((week) =>
        weekRepository.create({
          userId,
          planId,
          weekNumber: week.weekNumber,
          phase: week.phase,
          isDeload: week.isDeload,
          volumeTarget: week.volumeTarget,
          startDate: week.startDate,
          endDate: week.endDate,
        }),
      );

      const savedWeeks = await weekRepository.save(weekEntities);
      const weekIdByNumber = new Map(savedWeeks.map((week) => [week.weekNumber, week.id]));

      const sessionEntities = generated.sessions
        .map((session) => {
          const weekNumber = this.weekNumberFromTempId(session.planWeekId);
          const savedWeekId = weekIdByNumber.get(weekNumber);
          if (!savedWeekId) {
            return null;
          }

          return sessionRepository.create({
            userId,
            planWeekId: savedWeekId,
            sessionType: session.sessionType,
            purpose: session.purpose,
            priority: session.priority,
            duration: session.duration,
            intensity: session.intensity,
            distanceTarget: session.distanceTarget,
            paceTarget: session.paceTarget,
            skippable: session.skippable,
            shortenable: session.shortenable,
            minimumDuration: session.minimumDuration,
            substituteOptions: session.substituteOptions,
            missImpact: session.missImpact,
            cyclePhaseRules: session.cyclePhaseRules,
            status: 'pending',
            completedAt: null,
            energyRating: null,
            linkedCalendarEventId: null,
            notes: null,
          });
        })
        .filter((session): session is PlannedSession => !!session);

      await sessionRepository.save(sessionEntities);
    });

    return this.findOneByUser(planId, userId);
  }

  async getPlanWeeks(planId: string, userId: string): Promise<PlanWeek[]> {
    await this.ensurePlanOwnership(planId, userId);
    return this.planWeekRepository.find({
      where: { planId },
      order: { weekNumber: 'ASC' },
    });
  }

  async getPlanWeek(planId: string, weekNumber: number, userId: string): Promise<PlanWeek> {
    await this.ensurePlanOwnership(planId, userId);

    const week = await this.planWeekRepository.findOne({
      where: { planId, weekNumber },
      relations: {
        sessions: true,
      },
      order: {
        sessions: {
          id: 'ASC',
        },
      },
    });

    if (!week) {
      throw new NotFoundException('Plan week not found');
    }

    return week;
  }

  async ensurePlanOwnership(planId: string, userId: string): Promise<TrainingPlan> {
    const plan = await this.planRepository.findOne({ where: { id: planId, userId } });
    if (!plan) {
      throw new NotFoundException('Training plan not found');
    }
    return plan;
  }

  private weekNumberFromTempId(value: string): number {
    const parsed = Number(value.replace('week-', ''));
    return Number.isNaN(parsed) ? 1 : parsed;
  }
}
