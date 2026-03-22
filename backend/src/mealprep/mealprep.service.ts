import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MealPrepSettings } from './mealprep.entity';
import { UpdateMealPrepDto } from './mealprep.dto';

@Injectable()
export class MealPrepService {
  constructor(
    @InjectRepository(MealPrepSettings)
    private readonly mealPrepRepository: Repository<MealPrepSettings>,
  ) {}

  async findByUser(userId: string): Promise<MealPrepSettings> {
    let settings = await this.mealPrepRepository.findOne({ where: { userId } });
    if (!settings) {
      settings = await this.create(userId);
    }
    return settings;
  }

  async create(userId: string): Promise<MealPrepSettings> {
    const settings = this.mealPrepRepository.create({
      userId,
      duration: 90,
      sessionsPerWeek: 2,
    });
    return this.mealPrepRepository.save(settings);
  }

  async update(userId: string, dto: UpdateMealPrepDto): Promise<MealPrepSettings> {
    let settings = await this.mealPrepRepository.findOne({ where: { userId } });
    if (!settings) {
      settings = await this.create(userId);
    }
    Object.assign(settings, dto);
    return this.mealPrepRepository.save(settings);
  }
}
