import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchedulerSettings } from './scheduler-settings.entity';
import { UpdateSchedulerSettingsDto } from './scheduler-settings.dto';

@Injectable()
export class SchedulerSettingsService {
  constructor(
    @InjectRepository(SchedulerSettings)
    private readonly settingsRepository: Repository<SchedulerSettings>,
  ) {}

  async findByUser(userId: string): Promise<SchedulerSettings> {
    let settings = await this.settingsRepository.findOne({ where: { userId } });
    if (!settings) {
      settings = await this.create(userId);
    }
    return settings;
  }

  async create(userId: string): Promise<SchedulerSettings> {
    const settings = this.settingsRepository.create({
      userId,
      beforeShiftBufferMinutes: 60,
      afterShiftBufferMinutes: 120,
      enduranceWorkoutMinDuration: 60,
      enduranceWeight: 45,
      strengthWeight: 30,
      yogaWeight: 25,
      autoPlaceEarliestTime: '06:00',
      autoPlaceLatestTime: '22:00',
      preferredWorkoutTimes: [],
      runningDistanceThreshold: 15,
      bikingDistanceThreshold: 40,
      swimmingDistanceThreshold: 3,
      enduranceRestDays: 1,
      cycleTrackingEnabled: false,
    });
    return this.settingsRepository.save(settings);
  }

  async update(userId: string, dto: UpdateSchedulerSettingsDto): Promise<SchedulerSettings> {
    let settings = await this.settingsRepository.findOne({ where: { userId } });
    if (!settings) {
      settings = await this.create(userId);
    }
    Object.assign(settings, dto);
    return this.settingsRepository.save(settings);
  }
}
