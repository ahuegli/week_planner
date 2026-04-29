import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CalendarEvent, ConflictCheckResult } from '../models/app-data.models';
import { SchedulerApiService } from './scheduler-api.service';

@Injectable({ providedIn: 'root' })
export class ConflictDetectorService {
  constructor(private readonly schedulerApi: SchedulerApiService) {}

  async check(
    event: Pick<CalendarEvent, 'date' | 'startTime' | 'endTime' | 'type'> & { commuteMinutes?: number },
    excludeEventId?: string,
  ): Promise<ConflictCheckResult | null> {
    if (!event.date) return null;

    try {
      return await firstValueFrom(
        this.schedulerApi.checkConflicts({
          event: {
            date: event.date,
            startTime: event.startTime,
            endTime: event.endTime,
            type: event.type,
            commuteMinutes: event.commuteMinutes,
          },
          excludeEventId,
        }),
      );
    } catch {
      return null; // fail gracefully — never block event creation
    }
  }
}
