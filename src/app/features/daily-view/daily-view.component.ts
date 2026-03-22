import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CalendarEvent } from '../../core/models/calendar-event.model';
import { PlannerService } from '../../core/services/planner.service';
import { DateCalculationService } from '../../core/services/date-calculation.service';

@Component({
  selector: 'app-daily-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './daily-view.component.html',
  styleUrl: './daily-view.component.scss',
})
export class DailyViewComponent {
  private readonly planner = inject(PlannerService);
  private readonly dateCalc = inject(DateCalculationService);

  @Input() weeklySnapshot: {
    totalWorkouts: number;
    totalDuration: number;
    placedWorkouts: number;
    unplacedWorkouts: number;
    averagePerDay: number;
  } | null = null;

  @Output() eventSelected = new EventEmitter<CalendarEvent>();

  getTodayDateString(): string {
    return this.dateCalc.getTodayDateString();
  }

  getTodaysEvents(): CalendarEvent[] {
    const today = new Date();
    const todayIndex = this.dateCalc.getTodayIndex();
    const todayDateStr = this.dateCalc.formatDate(today);

    return this.planner
      .events()
      .filter((event) => {
        if (event.day !== todayIndex) return false;
        if (event.isRepeatingWeekly) return true;
        if (event.date) {
          return event.date === todayDateStr;
        }
        return event.weekOffset === undefined || event.weekOffset === 0;
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  getTodaySnapshot(): {
    totalWorkouts: number;
    totalDuration: number;
    totalShifts: number;
    mealPrepEvents: number;
    averageWorkoutTime: number;
  } {
    const todaysEvents = this.getTodaysEvents();
    let workoutCount = 0;
    let totalDuration = 0;
    let shiftCount = 0;
    let mealPrepCount = 0;

    todaysEvents.forEach((event) => {
      const duration = this.calculateEventDuration(event);

      if (event.type === 'workout') {
        workoutCount++;
        totalDuration += duration;
      } else if (event.type === 'shift') {
        shiftCount++;
      } else if (event.type === 'mealprep') {
        mealPrepCount++;
      }
    });

    return {
      totalWorkouts: workoutCount,
      totalDuration,
      totalShifts: shiftCount,
      mealPrepEvents: mealPrepCount,
      averageWorkoutTime: workoutCount > 0 ? Math.round(totalDuration / workoutCount) : 0,
    };
  }

  getEarlierTodayEvents(): CalendarEvent[] {
    const currentTime = this.dateCalc.getCurrentTime();
    return this.getTodaysEvents().filter((event) => event.endTime <= currentTime);
  }

  getEventCurrentlyHappening(): CalendarEvent | null {
    const now = new Date();
    const todaysEvents = this.getTodaysEvents();

    return (
      todaysEvents.find((event) => {
        const startMinutes = this.dateCalc.timeToMinutes(event.startTime);
        const endMinutes = this.dateCalc.timeToMinutes(event.endTime);
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        return startMinutes <= nowMinutes && nowMinutes < endMinutes;
      }) || null
    );
  }

  getEventProgressPercentage(event: CalendarEvent): number | null {
    const now = new Date();
    const startMinutes = this.dateCalc.timeToMinutes(event.startTime);
    const endMinutes = this.dateCalc.timeToMinutes(event.endTime);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    if (nowMinutes < startMinutes) return null;
    if (nowMinutes >= endMinutes) return null;

    const totalDuration = endMinutes - startMinutes;
    const elapsed = nowMinutes - startMinutes;
    return Math.round((elapsed / totalDuration) * 100);
  }

  getNextUpcomingEvents(): CalendarEvent[] {
    const now = new Date();
    const upcoming: Array<{ event: CalendarEvent; start: number }> = [];

    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const date = new Date(now);
      date.setDate(now.getDate() + dayOffset);
      date.setHours(0, 0, 0, 0);

      const weekdayIndex = this.dateCalc.getDayOfWeek(date);
      const dateStr = this.dateCalc.formatDate(date);

      const dayEvents = this.planner
        .events()
        .filter((event) => {
          if (event.day !== weekdayIndex) return false;
          if (event.isRepeatingWeekly) return true;
          if (event.date) {
            return event.date === dateStr;
          }
          const weekOffset = this.dateCalc.getWeekOffsetForDate(date);
          return event.weekOffset === undefined || event.weekOffset === weekOffset;
        });

      dayEvents.forEach((event) => {
        const [hours, minutes] = event.startTime.split(':').map(Number);
        const eventStart = new Date(date);
        eventStart.setHours(hours, minutes, 0, 0);

        if (eventStart.getTime() <= now.getTime()) {
          return;
        }

        upcoming.push({ event, start: eventStart.getTime() });
      });
    }

    return upcoming
      .sort((a, b) => a.start - b.start)
      .slice(0, 6)
      .map((item) => item.event);
  }

  getReminders(): string[] {
    const reminders: string[] = [];
    const todaysEvents = this.getTodaysEvents();
    const upcomingEvents = this.getNextUpcomingEvents().slice(0, 3);

    const unplaced = this.planner.unplacedWorkouts().length;
    if (unplaced > 0) {
      reminders.push(
        `📌 You have ${unplaced} unplaced workout${unplaced > 1 ? 's' : ''} this week`,
      );
    }

    const workoutCount = todaysEvents.filter((e) => e.type === 'workout').length;
    if (workoutCount > 2) {
      reminders.push('💪 You have a lot of workouts today - make sure you stay hydrated!');
    }

    if (upcomingEvents.length > 0) {
      const nextEvent = upcomingEvents[0];
      reminders.push(`📍 Next up in ${this.getTimeDifference(nextEvent)}: ${nextEvent.title}`);
    }

    const mealPrepEvents = todaysEvents.filter((e) => e.type === 'mealprep').length;
    if (mealPrepEvents === 0) {
      reminders.push('🍽️ No meal prep scheduled today. Consider planning your meals!');
    }

    return reminders;
  }

  getEventTypeTag(eventType: string): string {
    switch (eventType) {
      case 'workout':
        return '🏋️ Workout';
      case 'shift':
        return '💼 Work';
      case 'mealprep':
        return '🍽️ Meal Prep';
      case 'custom-event':
        return '📌 Event';
      default:
        return '📅 Event';
    }
  }

  onEventSelected(event: CalendarEvent): void {
    this.eventSelected.emit(event);
  }

  private calculateEventDuration(event: CalendarEvent): number {
    const startMinutes = this.dateCalc.timeToMinutes(event.startTime);
    const endMinutes = this.dateCalc.timeToMinutes(event.endTime);
    let duration = endMinutes - startMinutes;
    if (duration < 0) duration += 24 * 60;
    return duration;
  }

  private getTimeDifference(event: CalendarEvent): string {
    const now = new Date();
    const [hours, minutes] = event.startTime.split(':').map(Number);
    const eventTime = new Date();
    eventTime.setHours(hours, minutes, 0);

    const diff = eventTime.getTime() - now.getTime();
    if (diff < 0) return 'Now';

    const minutesDiff = Math.floor(diff / (1000 * 60));
    if (minutesDiff < 60) {
      return `${minutesDiff}m`;
    }
    const hoursDiff = Math.floor(minutesDiff / 60);
    const remainingMins = minutesDiff % 60;
    return remainingMins > 0 ? `${hoursDiff}h ${remainingMins}m` : `${hoursDiff}h`;
  }
}
