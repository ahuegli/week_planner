import { computed, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { CalendarEvent as UiCalendarEvent } from '../../mock-data';
import {
  CalendarEvent,
  CreateEnergyCheckInPayload,
  CreateNotePayload,
  CreateSymptomLogPayload,
  CycleCurrentPhase,
  CycleProfile,
  EnergyCheckIn,
  IHaveTimeSuggestion,
  MealprepSettings,
  Note,
  PlanCreatePayload,
  RescheduleConflictsResult,
  ScheduleEntirePlanResult,
  PlannedSession,
  PlanWeek,
  SessionCarryForwardResult,
  SchedulerSettings,
  SkipSessionResponse,
  SymptomLog,
  TrainingPlan,
  UpdateNotePayload,
  WeeklyProgress,
  Workout,
} from '../models/app-data.models';
import { CalendarEventApiService } from './calendar-event-api.service';
import { EnergyCheckInApiService } from './energy-check-in-api.service';
import { NoteApiService } from './note-api.service';
import { SymptomLogApiService } from './symptom-log-api.service';
import { WorkoutApiService } from './workout-api.service';
import { SettingsApiService } from './settings-api.service';
import { PlanApiService } from './plan-api.service';
import { CycleApiService } from './cycle-api.service';
import { SchedulerApiService } from './scheduler-api.service';
import { cycleTrackingEnabled } from '../../shared/state/cycle-ui.state';
import { CycleStatus } from '../../features/onboarding/onboarding.models';
import { UiFeedbackService } from '../../shared/ui-feedback.service';
import { getWorkoutDescription } from '../utils/workout-descriptions';

@Injectable({ providedIn: 'root' })
export class DataStoreService {
  readonly calendarEvents = signal<CalendarEvent[]>([]);
  readonly workouts = signal<Workout[]>([]);
  readonly schedulerSettings = signal<SchedulerSettings | null>(null);
  readonly mealprepSettings = signal<MealprepSettings | null>(null);
  readonly currentPlan = signal<TrainingPlan | null>(null);
  readonly planWeeks = signal<PlanWeek[]>([]);
  readonly currentWeekSessions = signal<PlannedSession[]>([]);
  readonly weeklyProgress = signal<WeeklyProgress[]>([]);
  readonly cycleProfile = signal<CycleProfile | null>(null);
  readonly currentPhase = signal<CycleCurrentPhase | null>(null);
  readonly notes = signal<Note[]>([]);
  readonly energyCheckIns = signal<EnergyCheckIn[]>([]);
  readonly symptomLogs = signal<SymptomLog[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showCoachAdjustmentPrompt = signal(false);
  readonly recentSkippedKeyCount = signal(0);

  readonly cycleStatusForDisplay = computed<CycleStatus | null>(() => {
    const profile = this.cycleProfile();
    if (!profile) return null;
    switch (profile.mode) {
      case 'natural':
        return profile.variability === 'high' ? 'irregular' : 'regular';
      case 'hormonal_contraception':
        return 'hormonal';
      case 'perimenopause':
        return 'menopause';
      case 'manual':
        return 'regular';
    }
  });

  private readonly hasLoaded = signal(false);

  constructor(
    private readonly calendarEventApi: CalendarEventApiService,
    private readonly energyCheckInApi: EnergyCheckInApiService,
    private readonly noteApi: NoteApiService,
    private readonly symptomLogApi: SymptomLogApiService,
    private readonly workoutApi: WorkoutApiService,
    private readonly settingsApi: SettingsApiService,
    private readonly planApi: PlanApiService,
    private readonly cycleApi: CycleApiService,
    private readonly schedulerApi: SchedulerApiService,
    private readonly uiFeedback: UiFeedbackService,
  ) {}

  async loadAll(): Promise<void> {
    if (this.hasLoaded()) {
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    try {
      const [events, workouts, schedulerSettings, mealprepSettings] = await Promise.all([
        firstValueFrom(this.calendarEventApi.getAll()),
        firstValueFrom(this.workoutApi.getAll()),
        firstValueFrom(this.settingsApi.getSchedulerSettings()),
        firstValueFrom(this.settingsApi.getMealprepSettings()),
      ]);

      this.calendarEvents.set(events.map((event) => this.normalizeCalendarEvent(event)));
      this.workouts.set(workouts);
      this.schedulerSettings.set(schedulerSettings);
      this.mealprepSettings.set(mealprepSettings);
      await this.loadPlan();

      if (cycleTrackingEnabled()) {
        await this.loadCycle();
      } else {
        this.cycleProfile.set(null);
        this.currentPhase.set(null);
      }

      this.hasLoaded.set(true);
    } catch (error) {
      console.error('[DataStore] Failed to load backend data', error);
      this.error.set('Could not load data from backend.');
      this.hasLoaded.set(false);
    } finally {
      this.isLoading.set(false);
    }
  }

  async addCalendarEvent(event: Partial<CalendarEvent>): Promise<void> {
    this.error.set(null);
    const snapshot = this.calendarEvents();

    const tempEvent: CalendarEvent = this.normalizeCalendarEvent({
      id: `temp-${Date.now()}`,
      title: event.title ?? 'Untitled Event',
      type: event.type ?? 'shift',
      day: event.day ?? 0,
      startTime: event.startTime ?? '09:00',
      endTime: event.endTime ?? '10:00',
      ...event,
    } as CalendarEvent);

    this.calendarEvents.set([...snapshot, tempEvent]);

    try {
      const created = await firstValueFrom(this.calendarEventApi.create(this.toCalendarEventApiPayload(event)));
      this.calendarEvents.set(
        this.calendarEvents().map((current) =>
          current.id === tempEvent.id ? this.normalizeCalendarEvent(created) : current,
        ),
      );
    } catch (error) {
      console.error('[DataStore] Failed to create calendar event', error);
      this.calendarEvents.set(snapshot);
      this.error.set('Could not create event.');
    }
  }

  async updateCalendarEvent(id: string, patch: Partial<CalendarEvent>): Promise<void> {
    this.error.set(null);
    const snapshot = this.calendarEvents();

    this.calendarEvents.set(
      snapshot.map((event) =>
        event.id === id ? this.normalizeCalendarEvent({ ...event, ...patch }) : event,
      ),
    );

    try {
      const updated = await firstValueFrom(this.calendarEventApi.update(id, this.toCalendarEventApiPayload(patch)));
      this.calendarEvents.set(
        this.calendarEvents().map((event) =>
          event.id === id ? this.normalizeCalendarEvent(updated) : event,
        ),
      );
    } catch (error) {
      console.error('[DataStore] Failed to update calendar event', error);
      this.calendarEvents.set(snapshot);
      this.error.set('Could not update event.');
    }
  }

  async deleteCalendarEvent(id: string): Promise<void> {
    this.error.set(null);
    const snapshot = this.calendarEvents();

    this.calendarEvents.set(snapshot.filter((event) => event.id !== id));

    try {
      await firstValueFrom(this.calendarEventApi.delete(id));
    } catch (error) {
      console.error('[DataStore] Failed to delete calendar event', error);
      this.calendarEvents.set(snapshot);
      this.error.set('Could not delete event.');
    }
  }

  async addWorkout(workout: Partial<Workout>): Promise<void> {
    this.error.set(null);
    const snapshot = this.workouts();

    const tempWorkout: Workout = {
      id: `temp-workout-${Date.now()}`,
      name: workout.name ?? 'Workout',
      workoutType: workout.workoutType ?? 'running',
      duration: workout.duration ?? 45,
      frequencyPerWeek: workout.frequencyPerWeek ?? 1,
      distanceKm: workout.distanceKm,
      distanceCountsAsLong: workout.distanceCountsAsLong,
    };

    this.workouts.set([...snapshot, tempWorkout]);

    try {
      const created = await firstValueFrom(this.workoutApi.create(workout));
      this.workouts.set(this.workouts().map((item) => (item.id === tempWorkout.id ? created : item)));
    } catch (error) {
      console.error('[DataStore] Failed to create workout', error);
      this.workouts.set(snapshot);
      this.error.set('Could not create workout.');
    }
  }

  async updateWorkout(id: string, patch: Partial<Workout>): Promise<void> {
    this.error.set(null);
    const snapshot = this.workouts();

    this.workouts.set(snapshot.map((workout) => (workout.id === id ? { ...workout, ...patch } : workout)));

    try {
      const updated = await firstValueFrom(this.workoutApi.update(id, patch));
      this.workouts.set(this.workouts().map((workout) => (workout.id === id ? updated : workout)));
    } catch (error) {
      console.error('[DataStore] Failed to update workout', error);
      this.workouts.set(snapshot);
      this.error.set('Could not update workout.');
    }
  }

  async deleteWorkout(id: string): Promise<void> {
    this.error.set(null);
    const snapshot = this.workouts();

    this.workouts.set(snapshot.filter((workout) => workout.id !== id));

    try {
      await firstValueFrom(this.workoutApi.delete(id));
    } catch (error) {
      console.error('[DataStore] Failed to delete workout', error);
      this.workouts.set(snapshot);
      this.error.set('Could not delete workout.');
    }
  }

  async updateSchedulerSettings(patch: Partial<SchedulerSettings>): Promise<void> {
    this.error.set(null);
    const snapshot = this.schedulerSettings();

    if (snapshot) {
      this.schedulerSettings.set({ ...snapshot, ...patch });
    }

    try {
      const updated = await firstValueFrom(this.settingsApi.updateSchedulerSettings(patch));
      this.schedulerSettings.set(updated);
    } catch (error) {
      console.error('[DataStore] Failed to update scheduler settings', error);
      this.schedulerSettings.set(snapshot);
      this.error.set('Could not save scheduler settings.');
    }
  }

  async updateMealprepSettings(patch: Partial<MealprepSettings>): Promise<void> {
    this.error.set(null);
    const snapshot = this.mealprepSettings();

    if (snapshot) {
      this.mealprepSettings.set({ ...snapshot, ...patch });
    }

    try {
      const updated = await firstValueFrom(this.settingsApi.updateMealprepSettings(patch));
      this.mealprepSettings.set(updated);
    } catch (error) {
      console.error('[DataStore] Failed to update meal prep settings', error);
      this.mealprepSettings.set(snapshot);
      this.error.set('Could not save meal prep settings.');
    }
  }

  async loadPlan(): Promise<void> {
    try {
      const plans = await firstValueFrom(this.planApi.getPlans());
      const activePlan = plans.find((plan) => plan.status === 'active') ?? plans[0] ?? null;

      if (!activePlan) {
        this.currentPlan.set(null);
        this.planWeeks.set([]);
        this.currentWeekSessions.set([]);
        this.weeklyProgress.set([]);
        this.recentSkippedKeyCount.set(0);
        this.showCoachAdjustmentPrompt.set(false);
        return;
      }

      const [fullPlan, progress] = await Promise.all([
        firstValueFrom(this.planApi.getPlan(activePlan.id)),
        firstValueFrom(this.planApi.getProgress(activePlan.id)),
      ]);

      const planWeeks = fullPlan.weeks ?? [];
      this.currentPlan.set(fullPlan);
      this.planWeeks.set(planWeeks);
      this.weeklyProgress.set(progress);

      if (planWeeks.length === 0) {
        this.currentWeekSessions.set([]);
        this.updateMissedKeySessionPrompt();
        return;
      }

      const currentWeekNumber = fullPlan.currentWeek || 1;
      const currentWeek = planWeeks.find((w) => w.weekNumber === currentWeekNumber);
      this.currentWeekSessions.set(currentWeek?.sessions ?? []);
      this.updateMissedKeySessionPrompt();
    } catch (error) {
      console.error('[DataStore] Failed to load plan data', error);
      this.currentPlan.set(null);
      this.planWeeks.set([]);
      this.currentWeekSessions.set([]);
      this.weeklyProgress.set([]);
      this.recentSkippedKeyCount.set(0);
      this.showCoachAdjustmentPrompt.set(false);
    }
  }

  async loadWeekSessions(planId: string, weekNumber: number): Promise<PlannedSession[]> {
    this.error.set(null);
    try {
      const sessions = await firstValueFrom(this.planApi.getWeekSessions(planId, weekNumber));
      return sessions;
    } catch (error) {
      console.error('[DataStore] Failed to load week sessions', error);
      this.error.set('Could not load week sessions.');
      return [];
    }
  }

  async suggestWorkoutRescheduleSlot(event: CalendarEvent | UiCalendarEvent): Promise<CalendarEvent | null> {

    if (event.type !== 'workout') {
      return null;
    }

    const eventDate = this.resolveEventDate(event);
    const weekStart = this.toDateString(this.startOfWeek(new Date(`${eventDate}T00:00:00`)));
    const schedulerSettings = this.schedulerSettings();
    const mealprepSettings = this.mealprepSettings();
    const duration = event.duration ?? event.durationMinutes ?? this.durationFromTimeRange(event.startTime, event.endTime);

    const existingEvents = this.eventsForWeek(weekStart)
      .filter((candidate) => candidate.id !== event.id)
      .filter(
        (candidate) =>
          candidate.type === 'shift' ||
          candidate.type === 'workout' ||
          candidate.type === 'custom-event' ||
          candidate.type === 'personal',
      )
      .map((candidate) => this.toSchedulerEvent(candidate));

    const payload = {
      existingEvents,
      workouts: [
        {
          id: event.id,
          name: event.title,
          workoutType: event.workoutType ?? this.fallbackWorkoutType(event.sessionType),
          duration,
          frequencyPerWeek: 1,
          distanceKm: event.distanceTarget ?? event.distanceKm,
          distanceCountsAsLong: event.distanceCountsAsLong,
        },
      ],
      mealPrep: {
        duration: mealprepSettings?.duration ?? 90,
        sessionsPerWeek: 0,
      },
      settings: schedulerSettings ? this.toSchedulerSettingsPayload(schedulerSettings) : undefined,
    };

    try {
      const response = await firstValueFrom(this.schedulerApi.generate(payload));
      const suggestion = response.placedEvents.find(
        (placedEvent) => (placedEvent.type ?? 'workout') === 'workout',
      );

      if (
        !suggestion ||
        typeof suggestion.day !== 'number' ||
        !suggestion.startTime ||
        !suggestion.endTime
      ) {
        return null;
      }

      const date = new Date(`${weekStart}T00:00:00`);
      date.setDate(date.getDate() + suggestion.day);

      return this.normalizeCalendarEvent({
        ...event,
        day: suggestion.day,
        date: this.toDateString(date),
        startTime: suggestion.startTime,
        endTime: suggestion.endTime,
        duration: suggestion.durationMinutes ?? duration,
        durationMinutes: suggestion.durationMinutes ?? duration,
        isManuallyPlaced: true,
      });
    } catch (error) {
      console.error('[DataStore] Failed to suggest workout reschedule slot', error);
      return null;
    }
  }

  async createPlan(planData: PlanCreatePayload): Promise<TrainingPlan | null> {
    this.error.set(null);

    try {
      const createdPlan = await firstValueFrom(this.planApi.createPlan(planData));
      this.currentPlan.set(createdPlan);
      this.planWeeks.set([]);
      this.currentWeekSessions.set([]);
      this.weeklyProgress.set([]);
      return createdPlan;
    } catch (error) {
      console.error('[DataStore] Failed to create plan', error);
      this.error.set('Could not create plan.');
      return null;
    }
  }

  async generatePlanTemplate(planId: string): Promise<void> {
    this.error.set(null);

    try {
      await firstValueFrom(this.planApi.generatePlanTemplate(planId));
      await this.loadPlan();
    } catch (error) {
      console.error('[DataStore] Failed to generate plan template', error);
      this.error.set('Could not generate plan sessions.');
    }
  }

  async scheduleEntirePlan(planId: string): Promise<ScheduleEntirePlanResult> {
    this.error.set(null);

    try {
      const result = await firstValueFrom(this.schedulerApi.generatePlan(planId));
      this.markUnloaded();
      await this.loadPlan();
      await this.loadAll();
      return result;
    } catch (error) {
      console.error('[DataStore] Failed to schedule full plan', error);
      this.error.set('Could not schedule the full plan.');
      throw error;
    }
  }

  async syncRecurringShiftsAndReschedule(params: {
    title: string;
    startTime: string;
    endTime: string;
    commuteMinutes: number;
    dayIndices: number[];
  }): Promise<{
    shiftsUpdated: number;
    shiftsCreated: number;
    shiftsDeleted: number;
    reschedule: RescheduleConflictsResult | null;
  }> {
    this.error.set(null);

    const allShiftEvents = this.calendarEvents().filter((event) => event.type === 'shift');
    const oneTimeShiftEvents = allShiftEvents.filter((event) => !event.isRepeatingWeekly);

    for (const shift of oneTimeShiftEvents) {
      await firstValueFrom(this.calendarEventApi.delete(shift.id));
    }

    const existingShifts = allShiftEvents
      .filter((event) => event.isRepeatingWeekly)
      .sort((a, b) => a.day - b.day);

    const byDay = new Map<number, CalendarEvent[]>();
    for (const shift of existingShifts) {
      const events = byDay.get(shift.day) ?? [];
      events.push(shift);
      byDay.set(shift.day, events);
    }

    const desiredDays = [...new Set(params.dayIndices)].sort((a, b) => a - b);
    const desiredDaySet = new Set(desiredDays);

    let shiftsUpdated = 0;
    let shiftsCreated = 0;
    let shiftsDeleted = oneTimeShiftEvents.length;

    for (const [day, dayShifts] of byDay.entries()) {
      if (desiredDaySet.has(day)) {
        continue;
      }

      for (const shift of dayShifts) {
        await firstValueFrom(this.calendarEventApi.delete(shift.id));
        shiftsDeleted += 1;
      }
    }

    for (const day of desiredDays) {
      const dayShifts = byDay.get(day) ?? [];
      const canonicalShift = dayShifts[0];

      if (!canonicalShift) {
        await firstValueFrom(
          this.calendarEventApi.create({
            title: params.title,
            type: 'shift',
            day,
            startTime: params.startTime,
            endTime: params.endTime,
            durationMinutes: this.durationFromTimeRange(params.startTime, params.endTime),
            isRepeatingWeekly: true,
            commuteMinutes: params.commuteMinutes,
          }),
        );
        shiftsCreated += 1;
        continue;
      }

      const hasChanged =
        canonicalShift.title !== params.title ||
        canonicalShift.startTime !== params.startTime ||
        canonicalShift.endTime !== params.endTime ||
        (canonicalShift.commuteMinutes ?? 0) !== params.commuteMinutes ||
        !canonicalShift.isRepeatingWeekly;

      if (hasChanged) {
        await firstValueFrom(
          this.calendarEventApi.update(canonicalShift.id, {
            title: params.title,
            type: 'shift',
            day,
            startTime: params.startTime,
            endTime: params.endTime,
            durationMinutes: this.durationFromTimeRange(params.startTime, params.endTime),
            isRepeatingWeekly: true,
            commuteMinutes: params.commuteMinutes,
          }),
        );
        shiftsUpdated += 1;
      }

      if (dayShifts.length > 1) {
        for (const duplicate of dayShifts.slice(1)) {
          await firstValueFrom(this.calendarEventApi.delete(duplicate.id));
          shiftsDeleted += 1;
        }
      }
    }

    const plan = this.currentPlan();
    let reschedule: RescheduleConflictsResult | null = null;
    if (plan) {
      reschedule = await firstValueFrom(this.schedulerApi.rescheduleConflicts(plan.id));
    }

    this.markUnloaded();
    await this.loadAll();

    return {
      shiftsUpdated,
      shiftsCreated,
      shiftsDeleted,
      reschedule,
    };
  }

  async rescheduleConflicts(planId: string): Promise<void> {
    const result = await firstValueFrom(
      this.schedulerApi.rescheduleConflicts(planId)
    );
    await this.loadPlan();
  }

  async deletePlan(planId: string): Promise<void> {
    this.error.set(null);

    try {
      await firstValueFrom(this.planApi.deletePlan(planId));
      this.currentPlan.set(null);
      this.planWeeks.set([]);
      this.currentWeekSessions.set([]);
      this.weeklyProgress.set([]);
    } catch (error) {
      console.error('[DataStore] Failed to delete plan', error);
      this.error.set('Could not delete plan.');
    }
  }

  async completeSession(
    sessionId: string,
    energyRating: 'easy' | 'moderate' | 'hard',
  ): Promise<PlannedSession | null> {
    this.error.set(null);
    const weekSnapshot = this.currentWeekSessions();
    const planSnapshot = this.currentPlan();

    this.patchSessionInCaches(sessionId, (session) => ({
      ...session,
      status: 'completed',
      energyRating,
      completedAt: new Date().toISOString(),
    }));

    try {
      const updated = await firstValueFrom(this.planApi.completeSession(sessionId, energyRating));
      this.patchSessionInCaches(sessionId, () => updated);
      this.replaceSessionInPlan(updated);
      await this.refreshProgress();
      return updated;
    } catch (error) {
      console.error('[DataStore] Failed to complete planned session', error);
      this.currentWeekSessions.set(weekSnapshot);
      this.currentPlan.set(planSnapshot);
      this.error.set('Could not complete session.');
      return null;
    }
  }

  async scheduleSession(sessionId: string, preferredDay?: number): Promise<PlannedSession | null> {
    this.error.set(null);

    try {
      const updated = await firstValueFrom(this.planApi.scheduleSession(sessionId, preferredDay));
      this.replaceSessionInPlan(updated);
      this.markUnloaded();
      await this.loadAll();
      return updated;
    } catch (error) {
      console.error('[DataStore] Failed to schedule planned session', error);
      this.error.set('Could not schedule session.');
      return null;
    }
  }

  async scheduleSessionNow(sessionId: string, date: string, startTime: string): Promise<PlannedSession | null> {
    this.error.set(null);

    try {
      const updated = await firstValueFrom(this.planApi.scheduleSessionNow(sessionId, date, startTime));
      this.replaceSessionInPlan(updated);
      this.markUnloaded();
      await this.loadAll();
      return updated;
    } catch (error) {
      console.error('[DataStore] Failed to schedule session now', error);
      this.error.set('Could not schedule session right now.');
      return null;
    }
  }

  getIHaveTimeSuggestion(targetDate: string): IHaveTimeSuggestion {
    const plan = this.currentPlan();
    if (!plan) {
      return {
        kind: 'no-plan',
        message: "You don't have a training plan yet. Want to create one?",
        ctaLabel: 'Create plan',
      };
    }

    const week = this.planWeeks().find((candidate) => targetDate >= candidate.startDate && targetDate <= candidate.endDate);
    if (!week) {
      return {
        kind: 'none',
        message: "You're all caught up! Enjoy your rest.",
        ctaLabel: null,
      };
    }

    const weekSessions = this.currentPlan()?.weeks?.find((candidate) => candidate.weekNumber === week.weekNumber)?.sessions ?? [];
    const pendingSessions = weekSessions
      .filter((session) => session.status === 'pending' && !session.linkedCalendarEventId)
      .sort((a, b) => this.priorityWeight(b.priority) - this.priorityWeight(a.priority));

    if (pendingSessions.length > 0) {
      const session = pendingSessions[0];
      const description = getWorkoutDescription(session.sessionType, week.phase, week.weekNumber, plan.mode, plan.sportType).whatToDo;
      return {
        kind: 'pending',
        message: `You have a ${this.formatSessionName(session.sessionType)} planned this week that hasn't been scheduled yet. Want to do it now?`,
        ctaLabel: "Let's do it",
        plannedSessionId: session.id,
        sessionType: this.formatSessionName(session.sessionType),
        duration: session.duration,
        intensity: session.intensity,
        description,
      };
    }

    const todayDate = this.toDateString(new Date());
    const isTargetToday = targetDate === todayDate;
    const currentTime = new Date();
    const currentMinutes = isTargetToday ? currentTime.getHours() * 60 + currentTime.getMinutes() : 0;
    const weekEvents = this.eventsForWeek(week.startDate);

    const laterTodayWorkout = weekEvents.find((event) => {
      if (event.type !== 'workout' || this.resolveEventDate(event) !== targetDate) {
        return false;
      }

      if (this.timeToMinutes(event.startTime) <= currentMinutes) {
        return false;
      }

      const linkedSession = this.findPlannedSessionByEventId(event.id);
      return !!linkedSession && linkedSession.status !== 'completed';
    });

    if (laterTodayWorkout) {
      const session = this.findPlannedSessionByEventId(laterTodayWorkout.id);
      if (session) {
        const description = getWorkoutDescription(
          session.sessionType,
          week.phase,
          week.weekNumber,
          plan.mode,
          plan.sportType,
        ).whatToDo;

        return {
          kind: 'tomorrow',
          message: `You have a ${this.formatSessionName(session.sessionType)} at ${laterTodayWorkout.startTime} today. Want to start early while you have time?`,
          ctaLabel: "Let's do it",
          plannedSessionId: session.id,
          sessionType: this.formatSessionName(session.sessionType),
          duration: session.duration,
          intensity: session.intensity,
          description,
        };
      }
    }

    const laterThisWeekWorkout = weekEvents.find((event) => {
      if (event.type !== 'workout') {
        return false;
      }

      const eventDate = this.resolveEventDate(event);
      if (eventDate <= targetDate || eventDate > week.endDate) {
        return false;
      }

      const linkedSession = this.findPlannedSessionByEventId(event.id);
      return !!linkedSession && linkedSession.status !== 'completed';
    });

    if (laterThisWeekWorkout) {
      const session = this.findPlannedSessionByEventId(laterThisWeekWorkout.id);
      if (session) {
        const eventDate = this.resolveEventDate(laterThisWeekWorkout);
        const dayOffset = Math.floor((new Date(`${eventDate}T00:00:00`).getTime() - new Date(`${targetDate}T00:00:00`).getTime()) / (1000 * 60 * 60 * 24));
        const dayLabel = dayOffset === 1
          ? 'Tomorrow'
          : new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(new Date(`${eventDate}T00:00:00`));
        const description = getWorkoutDescription(
          session.sessionType,
          week.phase,
          week.weekNumber,
          plan.mode,
          plan.sportType,
        ).whatToDo;

        return {
          kind: 'tomorrow',
          message: `${dayLabel} you have ${this.formatSessionName(session.sessionType)}. Want to knock it out today while you have time?`,
          ctaLabel: "Let's do it",
          plannedSessionId: session.id,
          sessionType: this.formatSessionName(session.sessionType),
          duration: session.duration,
          intensity: session.intensity,
          description,
        };
      }
    }

    const mealPrepCandidate = weekEvents.find((event) => {
      if (event.type !== 'mealprep') {
        return false;
      }

      const eventDate = this.resolveEventDate(event);
      if (eventDate < targetDate || eventDate > week.endDate) {
        return false;
      }

      if (eventDate === targetDate && this.timeToMinutes(event.endTime) <= currentMinutes) {
        return false;
      }

      return true;
    });

    if (mealPrepCandidate) {
      return {
        kind: 'mealprep',
        message: 'Good time for meal prep - you have about 90 minutes free.',
        ctaLabel: "Let's do it",
        eventId: mealPrepCandidate.id,
        sessionType: 'Meal Prep',
        duration: mealPrepCandidate.durationMinutes ?? mealPrepCandidate.duration ?? 90,
      };
    }

    const totalSessions = weekSessions.length;
    const completedSessions = weekSessions.filter((session) => session.status === 'completed').length;
    const completionRate = totalSessions > 0 ? completedSessions / totalSessions : 0;
    const hasOpenWorkouts = weekSessions.some((session) => session.status === 'pending' || session.status === 'scheduled');

    if (!hasOpenWorkouts && completionRate < 1) {
      const makeUpSession = weekSessions.find((session) => session.status === 'skipped' || session.status === 'moved');

      if (makeUpSession) {
        const linkedEvent = makeUpSession.linkedCalendarEventId
          ? this.calendarEvents().find((event) => event.id === makeUpSession.linkedCalendarEventId)
          : null;
        const missedDay = linkedEvent
          ? new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(new Date(`${this.resolveEventDate(linkedEvent)}T00:00:00`))
          : null;
        const description = getWorkoutDescription(
          makeUpSession.sessionType,
          week.phase,
          week.weekNumber,
          plan.mode,
          plan.sportType,
        ).whatToDo;

        return {
          kind: 'tomorrow',
          message: missedDay
            ? `You missed ${missedDay}'s ${this.formatSessionName(makeUpSession.sessionType)}. Want to make it up now?`
            : `You missed ${this.formatSessionName(makeUpSession.sessionType)} this week. Want to make it up now?`,
          ctaLabel: "Let's do it",
          plannedSessionId: makeUpSession.id,
          sessionType: this.formatSessionName(makeUpSession.sessionType),
          duration: makeUpSession.duration,
          intensity: makeUpSession.intensity,
          description,
        };
      }
    }

    const allDone = totalSessions > 0 && completionRate === 1;
    if (allDone) {
      const recoveryDescription = getWorkoutDescription('mobility', week.phase, week.weekNumber, plan.mode, plan.sportType).whatToDo;
      return {
        kind: 'recovery',
        message: 'All sessions done! How about 20 min of Yoga & Mobility for recovery?',
        ctaLabel: "Let's do it",
        sessionType: 'Yoga & Mobility',
        duration: 20,
        intensity: 'easy',
        description: recoveryDescription,
      };
    }

    return {
      kind: 'none',
      message: "You're all caught up! Enjoy your rest.",
      ctaLabel: null,
    };
  }

  async skipSession(sessionId: string): Promise<PlannedSession | null> {
    this.error.set(null);
    const snapshot = this.currentWeekSessions();
    const planSnapshot = this.currentPlan();

    this.patchSessionInCaches(sessionId, (session) => ({
      ...session,
      status: 'skipped',
    }));

    try {
      const rawResponse = await firstValueFrom(this.planApi.skipSession(sessionId)) as SkipSessionResponse | PlannedSession;
      const response: SkipSessionResponse = 'skippedSession' in rawResponse
        ? rawResponse
        : { skippedSession: rawResponse, carryForward: null };
      const updated = response.skippedSession;

      if (!updated) {
        throw new Error('Invalid skip session response payload.');
      }

      this.replaceSessionInPlan(updated);

      if (response.carryForward?.created) {
        await this.loadPlan();
      }

      await this.refreshProgress();
      this.showSkipFeedback(updated, response.carryForward);
      this.updateMissedKeySessionPrompt();
      return updated;
    } catch (error) {
      console.error('[DataStore] Failed to skip planned session', error);
      this.currentWeekSessions.set(snapshot);
      this.currentPlan.set(planSnapshot);
      this.updateMissedKeySessionPrompt();
      this.error.set('Could not skip session.');
      return null;
    }
  }

  findPlannedSessionByEventId(eventId: string): PlannedSession | null {
    const planWeeks = this.currentPlan()?.weeks ?? [];

    for (const week of planWeeks) {
      const linkedSession = week.sessions?.find((session) => session.linkedCalendarEventId === eventId);
      if (linkedSession) {
        return linkedSession;
      }
    }

    return this.currentWeekSessions().find((session) => session.linkedCalendarEventId === eventId) ?? null;
  }

  async deleteWorkoutEventAndSkipLinkedSession(
    eventId: string,
  ): Promise<{ success: boolean; linkedSession: PlannedSession | null }> {
    const linkedSession = this.findPlannedSessionByEventId(eventId);

    if (linkedSession) {
      const skipped = await this.skipSession(linkedSession.id);
      if (!skipped) {
        return {
          success: false,
          linkedSession,
        };
      }
    }

    const deleteSnapshot = this.calendarEvents();
    await this.deleteCalendarEvent(eventId);
    const success = deleteSnapshot.some((event) => event.id === eventId)
      ? !this.calendarEvents().some((event) => event.id === eventId)
      : true;

    return {
      success,
      linkedSession,
    };
  }

  async loadCycle(): Promise<void> {
    try {
      const [profile, phase] = await Promise.all([
        firstValueFrom(this.cycleApi.getProfile()),
        firstValueFrom(this.cycleApi.getCurrentPhase()),
      ]);

      this.cycleProfile.set(profile);
      this.currentPhase.set(phase);
    } catch (error) {
      console.error('[DataStore] Failed to load cycle data', error);
      this.cycleProfile.set(null);
      this.currentPhase.set(null);
    }
  }

  async updateCycleProfile(patch: Partial<CycleProfile>): Promise<void> {
    this.error.set(null);
    const snapshot = this.cycleProfile();

    if (snapshot) {
      this.cycleProfile.set({ ...snapshot, ...patch });
    }

    try {
      const updated = await firstValueFrom(this.cycleApi.updateProfile(patch));
      this.cycleProfile.set(updated);
      const phase = await firstValueFrom(this.cycleApi.getCurrentPhase());
      this.currentPhase.set(phase);
    } catch (error) {
      console.error('[DataStore] Failed to update cycle profile', error);
      this.cycleProfile.set(snapshot);
      this.error.set('Could not save cycle settings.');
    }
  }

  async logPeriodStart(date: string): Promise<void> {
    this.error.set(null);

    try {
      const profile = await firstValueFrom(this.cycleApi.logPeriod(date));
      this.cycleProfile.set(profile);
      const phase = await firstValueFrom(this.cycleApi.getCurrentPhase());
      this.currentPhase.set(phase);
    } catch (error) {
      console.error('[DataStore] Failed to log period start', error);
      this.error.set('Could not log period start.');
    }
  }

  async loadNotes(): Promise<void> {
    try {
      const notes = await firstValueFrom(this.noteApi.getAll());
      this.notes.set(notes);
    } catch (error) {
      console.error('[DataStore] Failed to load notes', error);
      this.notes.set([]);
    }
  }

  async addNote(payload: CreateNotePayload): Promise<Note | null> {
    this.error.set(null);
    const snapshot = this.notes();
    const tempNote: Note = {
      id: `temp-note-${Date.now()}`,
      userId: '',
      title: payload.title,
      body: payload.body ?? null,
      dueDate: payload.dueDate ?? null,
      dueTime: payload.dueTime ?? null,
      isScheduled: false,
      estimatedDurationMinutes: payload.estimatedDurationMinutes ?? null,
      wantsScheduling: payload.wantsScheduling ?? false,
      linkedCalendarEventId: null,
      completed: false,
      completedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.notes.set([tempNote, ...snapshot]);

    try {
      const created = await firstValueFrom(this.noteApi.create(payload));
      this.notes.set(this.notes().map((n) => (n.id === tempNote.id ? created : n)));
      return created;
    } catch (error) {
      console.error('[DataStore] Failed to create note', error);
      this.notes.set(snapshot);
      this.error.set('Could not create note.');
      return null;
    }
  }

  async updateNote(id: string, payload: UpdateNotePayload): Promise<void> {
    this.error.set(null);
    const snapshot = this.notes();

    this.notes.set(snapshot.map((n) => (n.id === id ? { ...n, ...payload } : n)));

    try {
      const updated = await firstValueFrom(this.noteApi.update(id, payload));
      this.notes.set(this.notes().map((n) => (n.id === id ? updated : n)));
    } catch (error) {
      console.error('[DataStore] Failed to update note', error);
      this.notes.set(snapshot);
      this.error.set('Could not update note.');
    }
  }

  async toggleNoteComplete(id: string, completed: boolean): Promise<void> {
    this.error.set(null);
    const snapshot = this.notes();

    this.notes.set(
      snapshot.map((n) =>
        n.id === id ? { ...n, completed, completedAt: completed ? new Date().toISOString() : null } : n,
      ),
    );

    try {
      const updated = await firstValueFrom(this.noteApi.toggleComplete(id, completed));
      this.notes.set(this.notes().map((n) => (n.id === id ? updated : n)));
    } catch (error) {
      console.error('[DataStore] Failed to toggle note complete', error);
      this.notes.set(snapshot);
      this.error.set('Could not update note.');
    }
  }

  async deleteNote(id: string): Promise<void> {
    this.error.set(null);
    const snapshot = this.notes();

    this.notes.set(snapshot.filter((n) => n.id !== id));

    try {
      await firstValueFrom(this.noteApi.delete(id));
    } catch (error) {
      console.error('[DataStore] Failed to delete note', error);
      this.notes.set(snapshot);
      this.error.set('Could not delete note.');
    }
  }

  async loadEnergyCheckIns(startDate?: string, endDate?: string): Promise<void> {
    try {
      const items = await firstValueFrom(this.energyCheckInApi.list(startDate, endDate));
      this.energyCheckIns.set(items);
    } catch (error) {
      console.error('[DataStore] Failed to load energy check-ins', error);
    }
  }

  async saveEnergyCheckIn(dto: CreateEnergyCheckInPayload): Promise<EnergyCheckIn | null> {
    const existing = this.energyCheckIns().find((e) => e.date === dto.date && e.source === dto.source);
    try {
      let saved: EnergyCheckIn;
      if (existing) {
        saved = await firstValueFrom(this.energyCheckInApi.update(existing.id, { level: dto.level }));
        this.energyCheckIns.update((list) => list.map((e) => (e.id === existing.id ? saved : e)));
      } else {
        saved = await firstValueFrom(this.energyCheckInApi.create(dto));
        this.energyCheckIns.update((list) => [...list, saved]);
      }
      return saved;
    } catch (error) {
      console.error('[DataStore] Failed to save energy check-in', error);
      return null;
    }
  }

  async loadSymptomLogs(startDate?: string, endDate?: string): Promise<void> {
    try {
      const items = await firstValueFrom(this.symptomLogApi.list(startDate, endDate));
      this.symptomLogs.set(items);
    } catch (error) {
      console.error('[DataStore] Failed to load symptom logs', error);
    }
  }

  async saveSymptomLog(dto: CreateSymptomLogPayload): Promise<SymptomLog | null> {
    const existing = this.symptomLogs().find((s) => s.date === dto.date);
    try {
      let saved: SymptomLog;
      if (existing) {
        saved = await firstValueFrom(this.symptomLogApi.update(existing.id, dto));
        this.symptomLogs.update((list) => list.map((s) => (s.id === existing.id ? saved : s)));
      } else {
        saved = await firstValueFrom(this.symptomLogApi.create(dto));
        this.symptomLogs.update((list) => [...list, saved]);
      }
      return saved;
    } catch (error) {
      console.error('[DataStore] Failed to save symptom log', error);
      return null;
    }
  }

  eventsForDay(date: string): CalendarEvent[] {
    return this.calendarEvents()
      .filter((event) => this.eventOccursOnDate(event, date))
      .map((event) => this.toOccurrenceForDate(event, date))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  eventsForWeek(startDate: string): CalendarEvent[] {
    const start = new Date(`${startDate}T00:00:00`);
    const weeklyEvents: CalendarEvent[] = [];

    for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + dayOffset);
      weeklyEvents.push(...this.eventsForDay(this.toDateString(date)));
    }

    return weeklyEvents.sort((a, b) => {
      const dateCompare = this.resolveEventDate(a).localeCompare(this.resolveEventDate(b));
      if (dateCompare !== 0) {
        return dateCompare;
      }

      return a.startTime.localeCompare(b.startTime);
    });
  }

  isLoaded(): boolean {
    return this.hasLoaded();
  }

  markUnloaded(): void {
    this.hasLoaded.set(false);
  }

  private async refreshProgress(): Promise<void> {
    const plan = this.currentPlan();
    if (!plan) {
      this.weeklyProgress.set([]);
      return;
    }

    try {
      const progress = await firstValueFrom(this.planApi.getProgress(plan.id));
      this.weeklyProgress.set(progress);
    } catch (error) {
      console.error('[DataStore] Failed to refresh weekly progress', error);
    }
  }

  private resolveEventDate(event: CalendarEvent | UiCalendarEvent): string {
    if (event.date) {
      return event.date;
    }

    const today = new Date();
    const monday = this.startOfWeek(today);
    const date = new Date(monday);
    const day = 'day' in event ? (event.day ?? 0) : (event.day ?? 0);
    date.setDate(monday.getDate() + day);

    return this.toDateString(date);
  }

  private eventOccursOnDate(event: CalendarEvent | UiCalendarEvent, date: string): boolean {
    if (event.isRepeatingWeekly) {
      return event.day === this.dayOfWeekIndex(date);
    }

    return this.resolveEventDate(event) === date;
  }

  private toOccurrenceForDate(event: CalendarEvent | UiCalendarEvent, date: string): CalendarEvent {
    if (!event.isRepeatingWeekly) {
      return event as CalendarEvent;
    }

    return {
      ...event,
      date,
      day: this.dayOfWeekIndex(date),
    } as CalendarEvent;
  }

  private dayOfWeekIndex(date: string): number {
    const parsed = new Date(`${date}T00:00:00`);
    return (parsed.getDay() + 6) % 7;
  }

  private normalizeCalendarEvent(event: CalendarEvent | UiCalendarEvent): CalendarEvent {
    const isPersonal = event.isPersonal || event.type === 'custom-event' || event.type === 'personal';

    return {
      ...event,
      type: isPersonal ? 'custom-event' : event.type,
      duration: event.duration ?? event.durationMinutes,
      durationMinutes: event.durationMinutes ?? event.duration,
      distanceTarget: event.distanceTarget ?? event.distanceKm,
      distanceKm: event.distanceKm ?? event.distanceTarget,
    } as CalendarEvent;
  }

  private toCalendarEventApiPayload(event: Partial<CalendarEvent>): Partial<CalendarEvent> {
    const isCustomEvent = event.type === 'custom-event' || event.type === 'personal';
    const mappedType = isCustomEvent ? 'shift' : event.type;

    return {
      ...event,
      type: mappedType,
      isPersonal: isCustomEvent || event.isPersonal,
      durationMinutes: event.durationMinutes ?? event.duration,
      distanceKm: event.distanceKm ?? event.distanceTarget,
    };
  }

  private toSchedulerEvent(event: CalendarEvent | UiCalendarEvent): CalendarEvent {
    const mappedType = event.type === 'personal' ? 'custom-event' : event.type;
    return {
      ...event,
      type: mappedType,
      durationMinutes: event.durationMinutes ?? event.duration,
      distanceKm: event.distanceKm ?? event.distanceTarget,
      isPersonal: event.type === 'custom-event' || event.type === 'personal' || event.isPersonal,
    } as CalendarEvent;
  }

  private toSchedulerSettingsPayload(settings: SchedulerSettings): {
    commuteMinutes: number;
    autoPlaceEarliestTime: string;
    autoPlaceLatestTime: string;
    enduranceWeight: number;
    strengthWeight: number;
    yogaWeight: number;
    enduranceThresholds: {
      running: { durationMin: number; distanceKm: number };
      biking: { durationMin: number; distanceKm: number };
      swimming: { durationMin: number; distanceKm: number };
    };
    enduranceRestDays: number;
    priorityHierarchy: Array<'sport' | 'recovery' | 'mealprep'>;
  } {
    return {
      commuteMinutes: 0,
      autoPlaceEarliestTime: '06:00',
      autoPlaceLatestTime: '22:00',
      enduranceWeight: settings.enduranceWeight,
      strengthWeight: settings.strengthWeight,
      yogaWeight: settings.yogaWeight,
      enduranceThresholds: {
        running: { durationMin: settings.enduranceWorkoutMinDuration, distanceKm: 15 },
        biking: { durationMin: Math.max(90, settings.enduranceWorkoutMinDuration), distanceKm: 40 },
        swimming: { durationMin: settings.enduranceWorkoutMinDuration, distanceKm: 3 },
      },
      enduranceRestDays: 1,
      priorityHierarchy: ['sport', 'recovery', 'mealprep'],
    };
  }

  private fallbackWorkoutType(sessionType?: string): Workout['workoutType'] {
    const normalized = (sessionType ?? '').toLowerCase();

    if (normalized.includes('bike') || normalized.includes('cycling')) {
      return 'biking';
    }

    if (normalized.includes('swim')) {
      return 'swimming';
    }

    if (normalized.includes('strength') || normalized.includes('lift')) {
      return 'strength';
    }

    if (normalized.includes('yoga') || normalized.includes('mobility')) {
      return 'yoga';
    }

    return 'running';
  }

  private startOfWeek(date: Date): Date {
    const copy = new Date(date);
    const day = copy.getDay();
    const diff = (day + 6) % 7;
    copy.setDate(copy.getDate() - diff);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  private toDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private shiftDate(date: string, days: number): string {
    const target = new Date(`${date}T00:00:00`);
    target.setDate(target.getDate() + days);
    return this.toDateString(target);
  }

  private priorityWeight(priority: PlannedSession['priority']): number {
    if (priority === 'key') {
      return 3;
    }
    if (priority === 'supporting') {
      return 2;
    }
    return 1;
  }

  private formatSessionName(sessionType: string): string {
    const labelMap: Record<string, string> = {
      easy_run: 'Easy Run',
      long_run: 'Long Run',
      tempo: 'Tempo Run',
      intervals: 'Intervals',
      hill_reps: 'Hill Reps',
      cardio_run: 'Cardio Run',
      strength: 'Strength Training',
      strength_training: 'Strength Training',
      hiit: 'HIIT',
      yoga: 'Yoga',
      mobility: 'Yoga & Mobility',
      swim: 'Swim',
      bike: 'Bike',
    };
    const normalized = sessionType.toLowerCase();
    return labelMap[normalized] ?? normalized.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private durationFromTimeRange(startTime: string, endTime: string): number {
    const toMinutes = (value: string) => {
      const [hours, minutes] = value.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const start = toMinutes(startTime);
    const end = toMinutes(endTime);
    const duration = end - start;
    return duration > 0 ? duration : 0;
  }

  private patchSessionInCaches(
    sessionId: string,
    updater: (session: PlannedSession) => PlannedSession,
  ): void {
    this.currentWeekSessions.update((sessions) =>
      sessions.map((session) => (session.id === sessionId ? updater(session) : session)),
    );

    const plan = this.currentPlan();
    if (!plan?.weeks) {
      return;
    }

    this.currentPlan.set({
      ...plan,
      weeks: plan.weeks.map((week) => ({
        ...week,
        sessions: week.sessions?.map((session) => (session.id === sessionId ? updater(session) : session)),
      })),
    });
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private replaceSessionInPlan(updatedSession: PlannedSession): void {
    this.currentWeekSessions.update((sessions) =>
      sessions.map((session) => (session.id === updatedSession.id ? updatedSession : session)),
    );

    const plan = this.currentPlan();
    if (!plan?.weeks) {
      return;
    }

    this.currentPlan.set({
      ...plan,
      weeks: plan.weeks.map((week) => ({
        ...week,
        sessions: week.sessions?.map((session) =>
          session.id === updatedSession.id ? updatedSession : session,
        ),
      })),
    });
  }

  private showSkipFeedback(
    session: PlannedSession,
    carryForward: SessionCarryForwardResult | null,
  ): void {
    if (session.priority === 'key') {
      if (carryForward?.created) {
        const day = carryForward.targetDay ?? 'later this week';
        this.uiFeedback.show(`Key session carried to ${day}. Your plan stays on track.`);
        return;
      }

      this.uiFeedback.show('Missed key session — your coach may suggest adjustments.');
      return;
    }

    this.uiFeedback.show('Session skipped');
  }

  private updateMissedKeySessionPrompt(): void {
    const plan = this.currentPlan();
    const weeks = plan?.weeks ?? [];
    if (!plan || weeks.length === 0) {
      this.recentSkippedKeyCount.set(0);
      this.showCoachAdjustmentPrompt.set(false);
      return;
    }

    const currentWeek = plan.currentWeek || 1;
    const earliestWeek = Math.max(1, currentWeek - 1);
    let skippedKeyCount = 0;

    for (const week of weeks) {
      if (week.weekNumber < earliestWeek || week.weekNumber > currentWeek) {
        continue;
      }

      skippedKeyCount +=
        week.sessions?.filter((session) => session.priority === 'key' && session.status === 'skipped').length ?? 0;
    }

    this.recentSkippedKeyCount.set(skippedKeyCount);
    this.showCoachAdjustmentPrompt.set(skippedKeyCount >= 3);
  }
}
