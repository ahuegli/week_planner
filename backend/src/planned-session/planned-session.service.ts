import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { PlannedSession } from './planned-session.entity';
import { PlanWeek } from '../plan-week/plan-week.entity';
import { TrainingPlan } from '../training-plan/training-plan.entity';
import { CalendarEvent } from '../calendar-event/calendar-event.entity';
import { SchedulerSettingsService } from '../scheduler-settings/scheduler-settings.service';
import { ScheduleGeneratorService } from '../domain/schedule-generator.service';
import {
  CalendarEvent as SchedulerCalendarEvent,
  SchedulerSettings as SchedulerSettingsModel,
  Workout,
  WorkoutType,
} from '../shared/models';

export interface CarryForwardResult {
  created: boolean;
  targetWeek?: number;
  targetDay?: string;
  reason: string;
}

export interface SkipSessionResult {
  skippedSession: PlannedSession;
  carryForward: CarryForwardResult | null;
}

interface CarryForwardScheduleResult {
  scheduled: boolean;
  scheduledDayIndex: number | null;
}

@Injectable()
export class PlannedSessionService {
  private readonly dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  constructor(
    @InjectRepository(PlannedSession)
    private readonly sessionRepository: Repository<PlannedSession>,
    @InjectRepository(PlanWeek)
    private readonly weekRepository: Repository<PlanWeek>,
    @InjectRepository(TrainingPlan)
    private readonly planRepository: Repository<TrainingPlan>,
    @InjectRepository(CalendarEvent)
    private readonly calendarEventRepository: Repository<CalendarEvent>,
    private readonly schedulerSettingsService: SchedulerSettingsService,
    private readonly scheduleGenerator: ScheduleGeneratorService,
  ) {}

  async getSessionsForWeek(userId: string, planId: string, weekNum: number): Promise<PlannedSession[]> {
    await this.ensurePlanOwnership(planId, userId);

    const week = await this.weekRepository.findOne({
      where: { planId, weekNumber: weekNum },
    });

    if (!week) {
      throw new NotFoundException('Plan week not found');
    }

    return this.sessionRepository.find({
      where: { planWeekId: week.id },
      order: { id: 'ASC' },
    });
  }

  async markComplete(userId: string, sessionId: string, energyRating?: 'easy' | 'moderate' | 'hard') {
    const session = await this.findOwnedSession(userId, sessionId);
    session.status = 'completed';
    session.completedAt = new Date();
    if (energyRating) {
      session.energyRating = energyRating;
    }
    return this.sessionRepository.save(session);
  }

  async markSkipped(userId: string, sessionId: string): Promise<SkipSessionResult> {
    const session = await this.findOwnedSession(userId, sessionId);
    session.status = 'skipped';
    session.completedAt = null;

    console.log('CARRY-FORWARD: session priority=', session.priority, 'type=', session.sessionType);

    if (session.priority === 'supporting') {
      session.notes = this.appendNote(session.notes, 'Supporting session skipped; no carry-forward created.');
    }

    const skippedSession = await this.sessionRepository.save(session);
    const carryForward =
      skippedSession.priority === 'key'
        ? await this.tryCarryForwardKeySession(skippedSession)
        : null;

    return {
      skippedSession,
      carryForward,
    };
  }

  async moveSession(userId: string, sessionId: string, targetDay: number) {
    const session = await this.findOwnedSession(userId, sessionId);
    session.status = 'moved';
    const note = `Moved to target day ${targetDay}`;
    session.notes = session.notes ? `${session.notes}\n${note}` : note;
    return this.sessionRepository.save(session);
  }

  async scheduleSession(userId: string, sessionId: string, preferredDay?: number): Promise<PlannedSession> {
    const session = await this.findOwnedSession(userId, sessionId);

    if (session.linkedCalendarEventId && session.status === 'scheduled') {
      return session;
    }

    const targetWeek = await this.weekRepository.findOne({
      where: { id: session.planWeekId },
    });

    if (!targetWeek) {
      throw new NotFoundException('Plan week not found');
    }

    await this.tryScheduleCarryForwardSession(session, targetWeek, typeof preferredDay === 'number' ? preferredDay : null);
    return this.findOwnedSession(userId, sessionId);
  }

  async scheduleSessionNow(userId: string, sessionId: string, date: string, startTime: string): Promise<PlannedSession> {
    const session = await this.findOwnedSession(userId, sessionId);
    const day = this.dayIndexFromDate(date);
    const endTime = this.addMinutesToTime(startTime, session.duration);

    let linkedEvent = session.linkedCalendarEventId
      ? await this.calendarEventRepository.findOne({ where: { id: session.linkedCalendarEventId, userId } })
      : null;

    if (linkedEvent) {
      linkedEvent.title = this.formatSessionName(session.sessionType, session.isCarryForward);
      linkedEvent.type = 'workout';
      linkedEvent.day = day;
      linkedEvent.date = date;
      linkedEvent.startTime = startTime;
      linkedEvent.endTime = endTime;
      linkedEvent.durationMinutes = session.duration;
      linkedEvent.priority = session.priority;
      linkedEvent.isManuallyPlaced = true;
      linkedEvent.isRepeatingWeekly = false;
      linkedEvent.isLocked = false;
      linkedEvent.isPersonal = false;
      linkedEvent = await this.calendarEventRepository.save(linkedEvent);
    } else {
      linkedEvent = await this.calendarEventRepository.save(
        this.calendarEventRepository.create({
          title: this.formatSessionName(session.sessionType, session.isCarryForward),
          type: 'workout',
          day,
          date,
          startTime,
          endTime,
          durationMinutes: session.duration,
          priority: session.priority,
          userId,
          isLocked: false,
          isPersonal: false,
          isRepeatingWeekly: false,
          isManuallyPlaced: true,
        }),
      );
    }

    session.linkedCalendarEventId = linkedEvent.id;
    session.status = 'scheduled';
    session.completedAt = null;
    await this.sessionRepository.save(session);

    return this.findOwnedSession(userId, sessionId);
  }

  private async findOwnedSession(userId: string, sessionId: string): Promise<PlannedSession> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: {
        planWeek: {
          plan: true,
        },
        linkedCalendarEvent: true,
      },
    });

    if (!session || session.planWeek.plan.userId !== userId) {
      throw new NotFoundException('Planned session not found');
    }

    return session;
  }

  private async ensurePlanOwnership(planId: string, userId: string): Promise<void> {
    const plan = await this.planRepository.findOne({
      where: { id: planId, userId },
    });

    if (!plan) {
      throw new NotFoundException('Training plan not found');
    }
  }

  private async tryCarryForwardKeySession(session: PlannedSession): Promise<CarryForwardResult> {
    const sourceWeek = await this.weekRepository.findOne({
      where: { id: session.planWeekId },
    });

    if (!sourceWeek) {
      console.log('CARRY-FORWARD: source week unavailable');
      return {
        created: false,
        reason: 'Missed key session — source week unavailable.',
      };
    }

    const sourceWeekSessions = await this.sessionRepository.find({
      where: { planWeekId: sourceWeek.id },
      relations: { linkedCalendarEvent: true },
    });

    console.log('CARRY-FORWARD: current week has', sourceWeekSessions.length, 'sessions');

    const skippedDay = this.resolveSessionDayIndex(session);
    const occupiedKeyDays = this.collectKeyDays(sourceWeekSessions, session.id);
    const currentWeekCandidateDays =
      typeof skippedDay === 'number'
        ? Array.from({ length: Math.max(0, 7 - (skippedDay + 1)) }, (_, offset) => skippedDay + 1 + offset)
        : [0, 1, 2, 3, 4, 5, 6];

    const currentWeekTargetDay = currentWeekCandidateDays.find((day) => !occupiedKeyDays.has(day));
    if (typeof currentWeekTargetDay === 'number') {
      console.log('CARRY-FORWARD: found slot in current week day', currentWeekTargetDay);
      const carryForward = await this.createCarryForwardSession(session, sourceWeek, currentWeekTargetDay);
      return {
        created: true,
        targetWeek: sourceWeek.weekNumber,
        targetDay: this.dayLabels[carryForward.scheduledDayIndex ?? currentWeekTargetDay],
        reason: carryForward.scheduled
          ? 'Key session carried to next available slot'
          : 'Key session carried forward, but no calendar slot was available this week.',
      };
    }

    console.log('CARRY-FORWARD: no slot in current week, checking next week', sourceWeek.weekNumber + 1);
    const nextWeek = await this.weekRepository.findOne({
      where: { planId: sourceWeek.planId, weekNumber: sourceWeek.weekNumber + 1 },
    });

    if (!nextWeek) {
      console.log('CARRY-FORWARD: next week not found');
      return {
        created: false,
        reason: 'Missed key session — no next week available for carry-forward.',
      };
    }

    const nextWeekSessions = await this.sessionRepository.find({
      where: { planWeekId: nextWeek.id },
      relations: { linkedCalendarEvent: true },
    });

    console.log('CARRY-FORWARD: next week has', nextWeekSessions.length, 'sessions');

    if (nextWeekSessions.length >= 5) {
      console.log('CARRY-FORWARD: next week full (>=5 sessions)');
      return {
        created: false,
        targetWeek: nextWeek.weekNumber,
        reason: 'Missed key session — next week already has 5 or more sessions.',
      };
    }

    const nextWeekKeyDays = this.collectKeyDays(nextWeekSessions);
    const nextWeekTargetDay = [0, 1, 2].find((day) => !nextWeekKeyDays.has(day));

    if (typeof nextWeekTargetDay !== 'number') {
      console.log('CARRY-FORWARD: no early-week slot available in next week');
      return {
        created: false,
        targetWeek: nextWeek.weekNumber,
        reason: 'Missed key session — no early-week slot available.',
      };
    }

    console.log('CARRY-FORWARD: creating make-up session in week', nextWeek.weekNumber, 'day', nextWeekTargetDay);
    const carryForward = await this.createCarryForwardSession(session, nextWeek, nextWeekTargetDay);
    return {
      created: true,
      targetWeek: nextWeek.weekNumber,
      targetDay: this.dayLabels[carryForward.scheduledDayIndex ?? nextWeekTargetDay],
      reason: carryForward.scheduled
        ? 'Key session carried to next available slot'
        : 'Key session carried forward, but no calendar slot was available this week.',
    };
  }

  private async createCarryForwardSession(
    sourceSession: PlannedSession,
    targetWeek: PlanWeek,
    targetDayIndex: number,
  ): Promise<CarryForwardScheduleResult> {
    const carryForwardSession = this.sessionRepository.create({
      userId: sourceSession.userId,
      planWeekId: targetWeek.id,
      sessionType: sourceSession.sessionType,
      purpose: sourceSession.purpose,
      priority: sourceSession.priority,
      duration: sourceSession.duration,
      intensity: sourceSession.intensity,
      distanceTarget: sourceSession.distanceTarget,
      paceTarget: sourceSession.paceTarget,
      skippable: sourceSession.skippable,
      shortenable: sourceSession.shortenable,
      minimumDuration: sourceSession.minimumDuration,
      substituteOptions: sourceSession.substituteOptions,
      missImpact: sourceSession.missImpact,
      cyclePhaseRules: sourceSession.cyclePhaseRules,
      status: 'pending',
      completedAt: null,
      energyRating: null,
      linkedCalendarEventId: null,
      notes: this.appendNote(
        sourceSession.notes,
        `Carry-forward make-up session for ${this.dayLabels[targetDayIndex]} from week ${sourceSession.planWeek?.weekNumber ?? targetWeek.weekNumber}.`,
      ),
      isCarryForward: true,
      originalWeekNumber: sourceSession.planWeek?.weekNumber ?? null,
    });

    const savedSession = await this.sessionRepository.save(carryForwardSession);
    return this.tryScheduleCarryForwardSession(savedSession, targetWeek, targetDayIndex);
  }

  private async tryScheduleCarryForwardSession(
    session: PlannedSession,
    targetWeek: PlanWeek,
    preferredDayIndex: number | null,
  ): Promise<CarryForwardScheduleResult> {
    const schedulerSettings = this.toSchedulerSettings(
      await this.schedulerSettingsService.findByUser(session.userId),
    );
    const weekEvents = await this.calendarEventRepository.find({
      where: {
        userId: session.userId,
        isRepeatingWeekly: false,
        date: Between(targetWeek.startDate, targetWeek.endDate),
      },
      order: {
        date: 'ASC',
        startTime: 'ASC',
      },
    });
    const recurringShiftTemplates = await this.calendarEventRepository.find({
      where: {
        userId: session.userId,
        isRepeatingWeekly: true,
        type: 'shift',
      },
      order: {
        day: 'ASC',
        startTime: 'ASC',
      },
    });
    const weekSessions = await this.sessionRepository.find({
      where: { planWeekId: targetWeek.id },
      order: { id: 'ASC' },
    });
    const linkedSessionByEventId = new Map(
      weekSessions
        .filter((candidate) => !!candidate.linkedCalendarEventId)
        .map((candidate) => [candidate.linkedCalendarEventId as string, candidate]),
    );

    const baseExistingEvents = [
      ...this.expandRepeatingShiftsForWeek(recurringShiftTemplates, targetWeek.startDate),
      ...weekEvents
        .filter((event) => {
          if (event.type !== 'workout') {
            return true;
          }

          const linkedSession = linkedSessionByEventId.get(event.id);
          return !linkedSession || (linkedSession.status !== 'skipped' && linkedSession.status !== 'moved');
        })
        .map((event) => this.toSchedulerEvent(event, linkedSessionByEventId.get(event.id) ?? null, targetWeek.startDate)),
    ];

    for (const candidateDayIndex of this.buildCandidateDayOrder(preferredDayIndex)) {
      const result = this.scheduleGenerator.generate({
        existingEvents: [
          ...baseExistingEvents,
          ...this.buildNonCandidateDayBlockers(targetWeek.startDate, candidateDayIndex),
        ],
        workouts: [this.toWorkout(session, true)],
        mealPrep: {
          duration: 0,
          sessionsPerWeek: 0,
        },
        settings: schedulerSettings,
      });
      const suggestion = result.placedEvents.find((event) => event.type === 'workout');

      if (!suggestion?.startTime || !suggestion.endTime) {
        continue;
      }

      const scheduledDayIndex = typeof suggestion.day === 'number' ? suggestion.day : candidateDayIndex;
      const date = this.dateForWeekday(targetWeek.startDate, scheduledDayIndex);
      const calendarEvent = this.calendarEventRepository.create({
        title: this.formatSessionName(session.sessionType, true),
        type: 'workout',
        day: scheduledDayIndex,
        date,
        startTime: suggestion.startTime,
        endTime: suggestion.endTime,
        durationMinutes: suggestion.durationMinutes ?? session.duration,
        priority: session.priority,
        userId: session.userId,
        isLocked: false,
        isPersonal: false,
        isRepeatingWeekly: false,
        isManuallyPlaced: false,
      });
      const savedEvent = await this.calendarEventRepository.save(calendarEvent);

      session.linkedCalendarEventId = savedEvent.id;
      session.status = 'scheduled';
      await this.sessionRepository.save(session);

      return {
        scheduled: true,
        scheduledDayIndex,
      };
    }

    session.status = 'pending';
    session.linkedCalendarEventId = null;
    await this.sessionRepository.save(session);

    return {
      scheduled: false,
      scheduledDayIndex: null,
    };
  }

  private collectKeyDays(sessions: PlannedSession[], excludedSessionId?: string): Set<number> {
    const days = new Set<number>();
    for (const session of sessions) {
      if (session.id === excludedSessionId || session.priority !== 'key') {
        continue;
      }

      const dayIndex = this.resolveSessionDayIndex(session);
      if (typeof dayIndex === 'number') {
        days.add(dayIndex);
      }
    }

    return days;
  }

  private resolveSessionDayIndex(session: PlannedSession): number | null {
    const event = session.linkedCalendarEvent;
    if (!event) {
      return null;
    }

    if (typeof event.day === 'number') {
      return event.day;
    }

    if (event.date) {
      const parsed = new Date(`${event.date}T00:00:00`);
      if (!Number.isNaN(parsed.getTime())) {
        return (parsed.getDay() + 6) % 7;
      }
    }

    return null;
  }

  private appendNote(existing: string | null, note: string): string {
    return existing ? `${existing}\n${note}` : note;
  }

  private expandRepeatingShiftsForWeek(shifts: CalendarEvent[], weekStartDate: string): SchedulerCalendarEvent[] {
    const events: SchedulerCalendarEvent[] = [];

    for (let offset = 0; offset < 7; offset += 1) {
      const date = this.dateForWeekday(weekStartDate, offset);
      const weekday = this.dayIndexFromDate(date);

      for (const shift of shifts) {
        if (shift.day !== weekday) {
          continue;
        }

        events.push({
          id: shift.id,
          title: shift.title,
          type: 'shift',
          day: offset,
          date,
          startTime: shift.startTime,
          endTime: shift.endTime,
          durationMinutes: shift.durationMinutes ?? undefined,
          shiftType: shift.shiftType ?? undefined,
          commuteMinutes: shift.commuteMinutes ?? undefined,
          isLocked: shift.isLocked,
          isPersonal: shift.isPersonal,
          isRepeatingWeekly: true,
        });
      }
    }

    return events;
  }

  private buildNonCandidateDayBlockers(
    weekStartDate: string,
    candidateDayIndex: number,
  ): SchedulerCalendarEvent[] {
    return Array.from({ length: 7 }, (_, dayIndex) => dayIndex)
      .filter((dayIndex) => dayIndex !== candidateDayIndex)
      .map((dayIndex) => ({
        id: `carry-forward-blocker-${dayIndex}`,
        title: 'Carry-forward day blocker',
        type: 'custom-event' as const,
        day: dayIndex,
        date: this.dateForWeekday(weekStartDate, dayIndex),
        startTime: '00:00',
        endTime: '23:59',
        isLocked: true,
        isPersonal: true,
        isRepeatingWeekly: false,
      }));
  }

  private buildCandidateDayOrder(preferredDayIndex: number | null): number[] {
    if (preferredDayIndex === null) {
      return [0, 1, 2, 3, 4, 5, 6];
    }

    const ordered = [preferredDayIndex];

    for (let offset = 1; offset < 7; offset += 1) {
      const before = preferredDayIndex - offset;
      const after = preferredDayIndex + offset;

      if (before >= 0) {
        ordered.push(before);
      }

      if (after < 7) {
        ordered.push(after);
      }
    }

    return ordered;
  }

  private toSchedulerEvent(
    event: CalendarEvent,
    linkedSession: PlannedSession | null,
    weekStartDate: string,
  ): SchedulerCalendarEvent {
    const day = event.date ? this.dayOffsetFromWeekStart(weekStartDate, event.date) : event.day;

    return {
      id: event.id,
      title: event.title,
      type: event.type,
      day,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      durationMinutes: event.durationMinutes ?? undefined,
      commuteMinutes: event.commuteMinutes ?? undefined,
      workoutType: linkedSession ? this.mapSessionTypeToWorkoutType(linkedSession.sessionType) : undefined,
      distanceKm: linkedSession?.distanceTarget ?? undefined,
      distanceCountsAsLong: linkedSession?.sessionType === 'long_run',
      isLocked: event.isLocked,
      isPersonal: event.isPersonal,
      isRepeatingWeekly: event.isRepeatingWeekly,
      sessionType: linkedSession?.sessionType ?? undefined,
      plannedSessionId: linkedSession?.id ?? undefined,
    };
  }

  private toWorkout(session: PlannedSession, isMakeUp = false): Workout {
    return {
      id: session.id,
      name: this.formatSessionName(session.sessionType, isMakeUp),
      workoutType: this.mapSessionTypeToWorkoutType(session.sessionType),
      duration: session.duration,
      frequencyPerWeek: 1,
      priority: session.priority,
      distanceKm: session.distanceTarget ?? undefined,
      distanceCountsAsLong: session.sessionType === 'long_run',
    };
  }

  private toSchedulerSettings(settings: Awaited<ReturnType<SchedulerSettingsService['findByUser']>>): SchedulerSettingsModel {
    return {
      commuteMinutes: settings.afterShiftBufferMinutes ?? 0,
      autoPlaceEarliestTime: settings.autoPlaceEarliestTime ?? '06:00',
      autoPlaceLatestTime: settings.autoPlaceLatestTime ?? '22:00',
      preferredWorkoutTimes: settings.preferredWorkoutTimes ?? [],
      enduranceWeight: settings.enduranceWeight,
      strengthWeight: settings.strengthWeight,
      yogaWeight: settings.yogaWeight,
      enduranceThresholds: {
        running: { durationMin: settings.enduranceWorkoutMinDuration, distanceKm: settings.runningDistanceThreshold ?? 15 },
        biking: { durationMin: Math.max(90, settings.enduranceWorkoutMinDuration), distanceKm: settings.bikingDistanceThreshold ?? 40 },
        swimming: { durationMin: settings.enduranceWorkoutMinDuration, distanceKm: settings.swimmingDistanceThreshold ?? 3 },
      },
      enduranceRestDays: settings.enduranceRestDays ?? 1,
      priorityHierarchy: ['sport', 'recovery', 'mealprep'],
    };
  }

  private formatSessionName(sessionType: string, isMakeUp = false): string {
    const normalized = sessionType.toLowerCase();
    const labelMap: Record<string, string> = {
      easy_run: 'Easy Run',
      long_run: 'Long Run',
      tempo: 'Tempo Run',
      intervals: 'Intervals',
      hill_reps: 'Hill Reps',
      cardio_run: 'Cardio Run',
      strength: 'Strength Training',
      hiit: 'HIIT',
      yoga: 'Yoga',
      mobility: 'Mobility',
      swim: 'Swim',
      bike: 'Bike',
    };
    const label = labelMap[normalized] ?? normalized.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

    return isMakeUp ? `${label} (Make-up)` : label;
  }

  private mapSessionTypeToWorkoutType(sessionType: string): WorkoutType {
    const normalized = sessionType.toLowerCase();

    if (
      normalized === 'easy_run' ||
      normalized === 'long_run' ||
      normalized === 'tempo' ||
      normalized === 'intervals' ||
      normalized === 'hill_reps' ||
      normalized === 'cardio_run'
    ) {
      return 'running';
    }

    if (normalized === 'strength' || normalized === 'hiit') {
      return 'strength';
    }

    if (normalized === 'yoga' || normalized === 'mobility') {
      return 'yoga';
    }

    if (normalized === 'swim') {
      return 'swimming';
    }

    if (normalized === 'bike') {
      return 'biking';
    }

    return 'strength';
  }

  private dayIndexFromDate(date: string): number {
    const parsed = new Date(`${date}T00:00:00`);
    return (parsed.getDay() + 6) % 7;
  }

  private dateForWeekday(weekStartDate: string, dayIndex: number): string {
    return this.shiftDate(weekStartDate, dayIndex);
  }

  private dayOffsetFromWeekStart(weekStartDate: string, date: string): number {
    const start = new Date(`${weekStartDate}T00:00:00`);
    const target = new Date(`${date}T00:00:00`);
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    return Math.round((target.getTime() - start.getTime()) / millisecondsPerDay);
  }

  private shiftDate(date: string, offset: number): string {
    const value = new Date(`${date}T00:00:00`);
    value.setDate(value.getDate() + offset);
    return this.toDateString(value);
  }

  private toDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private addMinutesToTime(startTime: string, durationMinutes: number): string {
    const [hoursText, minutesText] = startTime.split(':');
    const baseMinutes = Number(hoursText) * 60 + Number(minutesText);
    const totalMinutes = baseMinutes + durationMinutes;
    const normalized = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
    const hours = Math.floor(normalized / 60);
    const minutes = normalized % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
}
