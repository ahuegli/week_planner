import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalendarEvent } from './calendar-event.entity';
import { CreateCalendarEventDto, UpdateCalendarEventDto } from './calendar-event.dto';

@Injectable()
export class CalendarEventService {
  constructor(
    @InjectRepository(CalendarEvent)
    private readonly eventRepository: Repository<CalendarEvent>,
  ) {}

  async findAllByUser(userId: string): Promise<CalendarEvent[]> {
    return this.eventRepository.find({
      where: { userId },
      order: { day: 'ASC', startTime: 'ASC' },
    });
  }

  async findOne(id: string, userId: string): Promise<CalendarEvent> {
    const event = await this.eventRepository.findOne({
      where: { id, userId },
    });
    if (!event) {
      throw new NotFoundException('Calendar event not found');
    }
    return event;
  }

  async create(userId: string, dto: CreateCalendarEventDto): Promise<CalendarEvent> {
    const event = this.eventRepository.create({
      ...dto,
      userId,
    });
    return this.eventRepository.save(event);
  }

  async createMany(userId: string, dtos: CreateCalendarEventDto[]): Promise<CalendarEvent[]> {
    const events = dtos.map((dto) =>
      this.eventRepository.create({
        ...dto,
        userId,
      }),
    );
    return this.eventRepository.save(events);
  }

  async update(id: string, userId: string, dto: UpdateCalendarEventDto): Promise<CalendarEvent> {
    const event = await this.findOne(id, userId);
    Object.assign(event, dto);
    return this.eventRepository.save(event);
  }

  async remove(id: string, userId: string): Promise<void> {
    const event = await this.findOne(id, userId);
    await this.eventRepository.remove(event);
  }

  async removeAllByUser(userId: string): Promise<void> {
    await this.eventRepository.delete({ userId });
  }

  async replaceAll(userId: string, dtos: CreateCalendarEventDto[]): Promise<CalendarEvent[]> {
    await this.removeAllByUser(userId);
    return this.createMany(userId, dtos);
  }
}
