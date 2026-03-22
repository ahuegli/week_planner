import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

export type CalendarEventType = 'shift' | 'workout' | 'mealprep';
export type ShiftType = 'early' | 'late' | 'night';

export interface CalendarEvent {
  id: string;
  title: string;
  type: CalendarEventType;
  day: number;
  startTime: string;
  endTime: string;
  durationMinutes?: number;
  shiftType?: ShiftType;
  isLocked: boolean;
  isPersonal: boolean;
  userId: string;
}

@Injectable()
export class MockCalendarEventService {
  private events: CalendarEvent[] = [
    {
      id: 'event-1',
      title: 'EARLY Shift',
      type: 'shift',
      day: 1,
      startTime: '06:00',
      endTime: '14:00',
      shiftType: 'early',
      isLocked: false,
      isPersonal: false,
      userId: 'demo-user-id',
    },
    {
      id: 'event-2',
      title: 'LATE Shift',
      type: 'shift',
      day: 3,
      startTime: '14:00',
      endTime: '22:00',
      shiftType: 'late',
      isLocked: false,
      isPersonal: false,
      userId: 'demo-user-id',
    },
  ];

  findAllByUser(userId: string): CalendarEvent[] {
    return this.events
      .filter((e) => e.userId === userId)
      .sort((a, b) => a.day - b.day || a.startTime.localeCompare(b.startTime));
  }

  findOne(id: string, userId: string): CalendarEvent {
    const event = this.events.find((e) => e.id === id && e.userId === userId);
    if (!event) {
      throw new NotFoundException('Calendar event not found');
    }
    return event;
  }

  create(userId: string, dto: Partial<CalendarEvent>): CalendarEvent {
    const event: CalendarEvent = {
      id: uuidv4(),
      title: dto.title || 'New Event',
      type: dto.type || 'workout',
      day: dto.day ?? 0,
      startTime: dto.startTime || '09:00',
      endTime: dto.endTime || '10:00',
      durationMinutes: dto.durationMinutes,
      shiftType: dto.shiftType,
      isLocked: dto.isLocked ?? false,
      isPersonal: dto.isPersonal ?? false,
      userId,
    };
    this.events.push(event);
    return event;
  }

  createMany(userId: string, dtos: Partial<CalendarEvent>[]): CalendarEvent[] {
    return dtos.map((dto) => this.create(userId, dto));
  }

  update(id: string, userId: string, dto: Partial<CalendarEvent>): CalendarEvent {
    const event = this.findOne(id, userId);
    Object.assign(event, dto);
    return event;
  }

  remove(id: string, userId: string): void {
    const index = this.events.findIndex((e) => e.id === id && e.userId === userId);
    if (index === -1) {
      throw new NotFoundException('Calendar event not found');
    }
    this.events.splice(index, 1);
  }

  removeAllByUser(userId: string): void {
    this.events = this.events.filter((e) => e.userId !== userId);
  }

  replaceAll(userId: string, dtos: Partial<CalendarEvent>[]): CalendarEvent[] {
    this.removeAllByUser(userId);
    return this.createMany(userId, dtos);
  }
}
