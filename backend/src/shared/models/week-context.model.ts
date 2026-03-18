import { CalendarEvent } from './calendar-event.model';

export interface WeekContext {
  exhaustionByDay: number[];
  commuteByDay: boolean[];
  personalEvents: CalendarEvent[];
}

export const DEFAULT_WEEK_CONTEXT: WeekContext = {
  exhaustionByDay: Array(7).fill(0),
  commuteByDay: Array(7).fill(false),
  personalEvents: [],
};
