import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CycleProfile } from './cycle-profile.entity';
import { UpdateCycleProfileDto } from './cycle-profile.dto';
import { SchedulerSettingsService } from '../scheduler-settings/scheduler-settings.service';

@Injectable()
export class CycleProfileService {
  constructor(
    @InjectRepository(CycleProfile)
    private readonly cycleRepository: Repository<CycleProfile>,
    private readonly schedulerSettingsService: SchedulerSettingsService,
  ) {}

  async getByUser(userId: string): Promise<CycleProfile> {
    const existing = await this.cycleRepository.findOne({ where: { userId } });
    if (existing) {
      return existing;
    }

    const created = this.cycleRepository.create({
      userId,
      mode: 'natural',
      recentCycleLengths: [],
      averageCycleLength: 28,
      variability: 'low',
    });
    return this.cycleRepository.save(created);
  }

  async update(userId: string, dto: UpdateCycleProfileDto): Promise<CycleProfile> {
    const profile = await this.getByUser(userId);
    Object.assign(profile, dto);
    return this.cycleRepository.save(profile);
  }

  async logPeriod(userId: string, date: string): Promise<CycleProfile> {
    const profile = await this.getByUser(userId);

    if (profile.lastPeriodStart) {
      const previous = new Date(`${profile.lastPeriodStart}T00:00:00Z`);
      const current = new Date(`${date}T00:00:00Z`);
      const diffMs = current.getTime() - previous.getTime();
      const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));

      if (diffDays > 0 && diffDays < 120) {
        const history = [...(profile.recentCycleLengths ?? []), diffDays].slice(-6);
        profile.recentCycleLengths = history;
        profile.averageCycleLength =
          Math.round(history.reduce((sum, value) => sum + value, 0) / history.length) ||
          profile.averageCycleLength;
      }
    }

    profile.lastPeriodStart = date;
    return this.cycleRepository.save(profile);
  }

  async getCurrentPhase(userId: string): Promise<{
    phase: string;
    cycleDay: number | null;
    averageCycleLength: number;
    mode: string;
  }> {
    const profile = await this.getByUser(userId);

    if (profile.currentPhaseOverride) {
      return {
        phase: profile.currentPhaseOverride,
        cycleDay: null,
        averageCycleLength: profile.averageCycleLength,
        mode: profile.mode,
      };
    }

    if (!profile.lastPeriodStart) {
      return {
        phase: 'unknown',
        cycleDay: null,
        averageCycleLength: profile.averageCycleLength,
        mode: profile.mode,
      };
    }

    const start = new Date(`${profile.lastPeriodStart}T00:00:00Z`);
    const now = new Date();
    const diffDays = Math.max(0, Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
    const cycleLength = Math.max(21, profile.averageCycleLength || 28);
    const cycleDay = (diffDays % cycleLength) + 1;

    const lutealStart = cycleLength - 13;
    const ovulationStart = Math.max(6, lutealStart - 3);

    let phase = 'follicular';
    if (cycleDay <= 5) {
      phase = 'menstrual';
    } else if (cycleDay >= lutealStart) {
      phase = 'luteal';
    } else if (cycleDay >= ovulationStart && cycleDay < lutealStart) {
      phase = 'ovulation';
    }

    return {
      phase,
      cycleDay,
      averageCycleLength: cycleLength,
      mode: profile.mode,
    };
  }

  async computePhasesForWeek(
    userId: string,
    weekStartDate: string,
  ): Promise<{
    phasesByDay: Array<'menstrual' | 'follicular' | 'ovulation' | 'luteal' | 'unknown'>;
    confidence: number;
    mode: string;
    trackingEnabled: boolean;
  }> {
    const profile = await this.getByUser(userId);
    const settings = await this.schedulerSettingsService.findByUser(userId);
    const trackingEnabled = settings.cycleTrackingEnabled;

    const unknown = Array(7).fill('unknown') as Array<'unknown'>;

    if (!trackingEnabled || profile.mode !== 'natural' || !profile.lastPeriodStart || profile.currentPhaseOverride) {
      return { phasesByDay: unknown, confidence: 0, mode: profile.mode, trackingEnabled };
    }

    const weekStart = new Date(`${weekStartDate}T00:00:00Z`);
    const periodStart = new Date(`${profile.lastPeriodStart}T00:00:00Z`);
    const cycleLength = Math.max(21, profile.averageCycleLength || 28);
    const lutealStart = cycleLength - 13;
    const ovulationStart = Math.max(6, lutealStart - 3);

    const phasesByDay = Array.from({ length: 7 }, (_, i) => {
      const diffDays = Math.max(
        0,
        Math.floor((weekStart.getTime() + i * 24 * 60 * 60 * 1000 - periodStart.getTime()) / (24 * 60 * 60 * 1000)),
      );
      const cycleDay = (diffDays % cycleLength) + 1;

      if (cycleDay <= 5) return 'menstrual' as const;
      if (cycleDay >= lutealStart) return 'luteal' as const;
      if (cycleDay >= ovulationStart && cycleDay < lutealStart) return 'ovulation' as const;
      return 'follicular' as const;
    });

    let confidence = 1.0;
    if (profile.variability === 'medium') confidence *= 0.75;
    if (profile.variability === 'high') confidence *= 0.5;
    if ((profile.recentCycleLengths ?? []).length < 3) confidence *= 0.7;
    confidence = Math.min(1.0, Math.max(0.0, confidence));

    return { phasesByDay, confidence, mode: profile.mode, trackingEnabled };
  }
}
