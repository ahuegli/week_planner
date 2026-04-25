import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
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

  async findByDateRange(userId: string, startDate: string, endDate: string): Promise<CalendarEvent[]> {
    const oneOffEvents = await this.eventRepository.find({
      where: {
        userId,
        isRepeatingWeekly: false,
        date: Between(startDate, endDate),
      },
      order: { date: 'ASC', startTime: 'ASC' },
    });

    const repeatingEvents = await this.eventRepository.find({
      where: {
        userId,
        isRepeatingWeekly: true,
      },
      order: { day: 'ASC', startTime: 'ASC' },
    });

    const expandedRepeatingEvents: CalendarEvent[] = [];
    const cursor = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);

    while (cursor <= end) {
      const weekday = (cursor.getDay() + 6) % 7;
      const date = this.toDateString(cursor);

      for (const event of repeatingEvents) {
        if (event.day !== weekday) {
          continue;
        }

        expandedRepeatingEvents.push({
          ...event,
          date,
          day: weekday,
        });
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    const recurringShiftKeys = new Set(
      expandedRepeatingEvents
        .filter((event) => event.type === 'shift')
        .map((event) => this.shiftOccurrenceKey(event)),
    );

    const dedupedOneOffEvents = oneOffEvents.filter((event) => {
      if (event.type !== 'shift') {
        return true;
      }

      return !recurringShiftKeys.has(this.shiftOccurrenceKey(event));
    });

    return [...dedupedOneOffEvents, ...expandedRepeatingEvents].sort((a, b) => {
      const dateCompare = (a.date ?? '').localeCompare(b.date ?? '');
      if (dateCompare !== 0) {
        return dateCompare;
      }

      return a.startTime.localeCompare(b.startTime);
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
    if (dto.isRepeatingWeekly && dto.type === 'shift') {
      const existing = await this.eventRepository.findOne({
        where: {
          userId,
          day: dto.day,
          type: 'shift',
          isRepeatingWeekly: true,
          startTime: dto.startTime,
          endTime: dto.endTime,
        },
      });

      if (existing) {
        Object.assign(existing, dto);
        return this.eventRepository.save(existing);
      }
    }

    const event = this.eventRepository.create({
      ...dto,
      userId,
    });
    return this.eventRepository.save(event);
  }

  async createMany(userId: string, dtos: CreateCalendarEventDto[]): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = [];

    for (const dto of dtos) {
      events.push(await this.create(userId, dto));
    }

    return events;
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

  private toDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private shiftOccurrenceKey(event: CalendarEvent): string {
    return [event.date ?? '', event.startTime, event.endTime, event.title].join('|');
  }
}
