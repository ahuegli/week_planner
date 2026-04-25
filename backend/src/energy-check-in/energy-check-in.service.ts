import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { EnergyCheckIn } from './energy-check-in.entity';
import { CreateEnergyCheckInDto, UpdateEnergyCheckInDto } from './energy-check-in.dto';

@Injectable()
export class EnergyCheckInService {
  constructor(
    @InjectRepository(EnergyCheckIn)
    private readonly repo: Repository<EnergyCheckIn>,
  ) {}

  findAllByUser(userId: string, startDate?: string, endDate?: string): Promise<EnergyCheckIn[]> {
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

  async findByUserAndDate(userId: string, date: string): Promise<EnergyCheckIn | null> {
    const results = await this.repo.find({
      where: { userId, date },
      order: { createdAt: 'DESC' },
      take: 1,
    });
    return results[0] ?? null;
  }

  async create(userId: string, dto: CreateEnergyCheckInDto): Promise<{ entity: EnergyCheckIn; created: boolean }> {
    const source = dto.source ?? 'daily_checkin';
    const existing = await this.repo.findOne({ where: { userId, date: dto.date, source } });
    if (existing) {
      Object.assign(existing, dto);
      const entity = await this.repo.save(existing);
      return { entity, created: false };
    }
    const entity = await this.repo.save(this.repo.create({ ...dto, source, userId }));
    return { entity, created: true };
  }

  async update(id: string, userId: string, dto: UpdateEnergyCheckInDto): Promise<EnergyCheckIn> {
    const checkin = await this.repo.findOne({ where: { id, userId } });
    if (!checkin) throw new NotFoundException('Energy check-in not found');
    Object.assign(checkin, dto);
    return this.repo.save(checkin);
  }

  async remove(id: string, userId: string): Promise<void> {
    const checkin = await this.repo.findOne({ where: { id, userId } });
    if (!checkin) throw new NotFoundException('Energy check-in not found');
    await this.repo.remove(checkin);
  }
}
