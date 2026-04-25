import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CycleProfile } from './cycle-profile.entity';
import { UpdateCycleProfileDto } from './cycle-profile.dto';

@Injectable()
export class CycleProfileService {
  constructor(
    @InjectRepository(CycleProfile)
    private readonly cycleRepository: Repository<CycleProfile>,
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
}
