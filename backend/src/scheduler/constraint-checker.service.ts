import { Injectable } from '@nestjs/common';
import { timeToMinutes, eventIntervals } from './scoring-engine.service';

@Injectable()
export class ConstraintCheckerService {
  validateAll(events: any[], shifts: any[], settings: any, weekContext: any): string[] {
    const violations: string[] = [];

    // Check for overlaps
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        if (this.eventsOverlap(events[i], events[j])) {
          violations.push(`Events "${events[i].title}" and "${events[j].title}" overlap`);
        }
      }
    }

    // Check shift buffer constraints
    for (const event of events.filter((e) => e.type !== 'shift')) {
      const dayShifts = shifts.filter((s) => s.day === event.day);
      for (const shift of dayShifts) {
        if (this.violatesShiftBuffer(event, shift, settings)) {
          violations.push(
            `Event "${event.title}" violates buffer constraint with shift on day ${event.day}`,
          );
        }
      }
    }

    return violations;
  }

  eventsOverlap(event1: any, event2: any): boolean {
    const intervals1 = eventIntervals(event1);
    const intervals2 = eventIntervals(event2);

    for (const i1 of intervals1) {
      for (const i2 of intervals2) {
        if (i1.day === i2.day) {
          const start1 = timeToMinutes(i1.start);
          const end1 = timeToMinutes(i1.end);
          const start2 = timeToMinutes(i2.start);
          const end2 = timeToMinutes(i2.end);

          if (start1 < end2 && start2 < end1) {
            return true;
          }
        }
      }
    }
    return false;
  }

  violatesShiftBuffer(event: any, shift: any, settings: any): boolean {
    const eventStart = timeToMinutes(event.startTime);
    const eventEnd = timeToMinutes(event.endTime);
    const shiftStart = timeToMinutes(shift.startTime);
    const shiftEnd = timeToMinutes(shift.endTime);

    // Check before shift buffer
    const beforeBuffer = settings.beforeShiftBufferMinutes || 60;
    if (eventEnd > shiftStart - beforeBuffer && eventEnd <= shiftStart) {
      return true;
    }

    // Check after shift buffer
    const afterBuffer = settings.afterShiftBufferMinutes || 120;
    if (eventStart >= shiftEnd && eventStart < shiftEnd + afterBuffer) {
      return true;
    }

    return false;
  }

  isSlotAvailable(
    day: number,
    startTime: string,
    endTime: string,
    occupied: { day: number; start: string; end: string }[],
  ): boolean {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);

    for (const slot of occupied.filter((o) => o.day === day)) {
      const slotStart = timeToMinutes(slot.start);
      const slotEnd = timeToMinutes(slot.end);

      if (start < slotEnd && slotStart < end) {
        return false;
      }
    }
    return true;
  }
}
