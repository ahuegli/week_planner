import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { SymptomLog } from './symptom-log.entity';
import { CreateSymptomLogDto, UpdateSymptomLogDto } from './symptom-log.dto';

@Injectable()
export class SymptomLogService {
  constructor(
    @InjectRepository(SymptomLog)
    private readonly repo: Repository<SymptomLog>,
  ) {}

  findAllByUser(userId: string, startDate?: string, endDate?: string): Promise<SymptomLog[]> {
    const dateWhere =
      startDate && endDate ? Between(startDate, endDate)
      : startDate ? MoreThanOrEqual(startDate)
      : endDate ? LessThanOrEqual(endDate)
      : undefined;

    return this.repo.find({
      where: { userId, ...(dateWhere ? { date: dateWhere } : {}) },
      order: { date: 'DESC' },
    });
  }

  async findByUserAndDate(userId: string, date: string): Promise<SymptomLog | null> {
    const results = await this.repo.find({
      where: { userId, date },
      order: { createdAt: 'DESC' },
      take: 1,
    });
    return results[0] ?? null;
  }

  async create(userId: string, dto: CreateSymptomLogDto): Promise<{ entity: SymptomLog; created: boolean }> {
    const existing = await this.repo.findOne({ where: { userId, date: dto.date } });
    if (existing) {
      Object.assign(existing, dto);
      const entity = await this.repo.save(existing);
      return { entity, created: false };
    }
    const entity = await this.repo.save(this.repo.create({ ...dto, userId }));
    return { entity, created: true };
  }

  async update(id: string, userId: string, dto: UpdateSymptomLogDto): Promise<SymptomLog> {
    const log = await this.repo.findOne({ where: { id, userId } });
    if (!log) throw new NotFoundException('Symptom log not found');
    Object.assign(log, dto);
    return this.repo.save(log);
  }

  async remove(id: string, userId: string): Promise<void> {
    const log = await this.repo.findOne({ where: { id, userId } });
    if (!log) throw new NotFoundException('Symptom log not found');
    await this.repo.remove(log);
  }
}
