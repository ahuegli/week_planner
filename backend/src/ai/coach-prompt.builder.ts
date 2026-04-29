import { Injectable } from '@nestjs/common';
import { TrainingPlanService } from '../training-plan/training-plan.service';
import { PlannedSessionService } from '../planned-session/planned-session.service';
import { CycleProfileService } from '../cycle-profile/cycle-profile.service';
import { WorkoutLogService } from '../workout-log/workout-log.service';
import { CalendarEventService } from '../calendar-event/calendar-event.service';
import { SchedulerSettingsService } from '../scheduler-settings/scheduler-settings.service';

@Injectable()
export class CoachPromptBuilder {
  constructor(
    private readonly trainingPlanService: TrainingPlanService,
    private readonly plannedSessionService: PlannedSessionService,
    private readonly cycleProfileService: CycleProfileService,
    private readonly workoutLogService: WorkoutLogService,
    private readonly calendarEventService: CalendarEventService,
    private readonly schedulerSettingsService: SchedulerSettingsService,
  ) {}

  async buildSystemPrompt(userId: string, extraContext?: string): Promise<string> {
    const lines: string[] = [];

    lines.push(
      'You are a supportive, knowledgeable personal running coach. ' +
      'You give concise, practical, empathetic advice. ' +
      'Keep replies under 150 words unless the user asks for more detail. ' +
      'If you suggest a schedule change, include a JSON suggestedAction block at the very end of your reply in this exact format: ' +
      '```json\n{"type":"reschedule|skip|swap|note","description":"..."}\n``` ' +
      'Otherwise, do not include any code blocks.',
    );

    // Training plan context
    try {
      const plans = await this.trainingPlanService.findAllByUser(userId);
      const activePlan = plans.find((p) => p.status === 'active') ?? plans[0];
      if (activePlan) {
        lines.push(
          `\nTRAINING PLAN: ${activePlan.mode} plan, sport: ${activePlan.sportType ?? 'running'}, ` +
          `week ${activePlan.currentWeek} of ${activePlan.totalWeeks}, status: ${activePlan.status}.` +
          (activePlan.goalDate ? ` Goal date: ${activePlan.goalDate}.` : '') +
          (activePlan.goalDistance ? ` Goal distance: ${activePlan.goalDistance}.` : '') +
          (activePlan.goalTime ? ` Goal time: ${activePlan.goalTime}.` : ''),
        );

        // Current week sessions
        try {
          const sessions = await this.plannedSessionService.getSessionsForWeek(
            userId,
            activePlan.id,
            activePlan.currentWeek,
          );
          if (sessions.length > 0) {
            const sessionSummaries = sessions.map(
              (s) =>
                `${s.sessionType} (${s.status ?? 'pending'}, ${s.intensity})`,
            );
            lines.push(`CURRENT WEEK SESSIONS: ${sessionSummaries.join(', ')}.`);
          }
        } catch {
          // sessions unavailable — continue
        }
      }
    } catch {
      // plan unavailable — continue
    }

    // Cycle profile
    try {
      const cycleProfile = await this.cycleProfileService.getByUser(userId);
      if (cycleProfile) {
        lines.push(
          `CYCLE PROFILE: average cycle length ${cycleProfile.averageCycleLength ?? 28} days, mode: ${cycleProfile.mode}.` +
          (cycleProfile.lastPeriodStart ? ` Last period start: ${cycleProfile.lastPeriodStart}.` : ''),
        );
      }
    } catch {
      // no cycle profile — user may not track this
    }

    // Recent workout logs (last 5)
    try {
      const logs = await this.workoutLogService.findAllByUser(userId);
      const recent = logs.slice(0, 5);
      if (recent.length > 0) {
        const logSummaries = recent.map(
          (l) =>
            `${l.completedAt?.toISOString().split('T')[0] ?? 'unknown date'}: ${l.sessionType}, energy ${l.energyRating ?? '?'}`,
        );
        lines.push(`RECENT WORKOUT LOGS: ${logSummaries.join('; ')}.`);
      }
    } catch {
      // logs unavailable
    }

    // Upcoming calendar events (next 7 days)
    try {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      const events = await this.calendarEventService.findByDateRange(
        userId,
        today.toISOString().split('T')[0],
        nextWeek.toISOString().split('T')[0],
      );
      if (events.length > 0) {
        const eventSummaries = events
          .slice(0, 5)
          .map((e) => `${e.date}: ${e.title} (${e.type})`);
        lines.push(`UPCOMING CALENDAR EVENTS (next 7 days): ${eventSummaries.join(', ')}.`);
      }
    } catch {
      // events unavailable
    }

    // Scheduler settings
    try {
      const settings = await this.schedulerSettingsService.findByUser(userId);
      if (settings) {
        lines.push(
          `SCHEDULER SETTINGS: workout times ${JSON.stringify(settings.preferredWorkoutTimes ?? [])}, ` +
          `buffers: before shift ${settings.beforeShiftBufferMinutes}min, after shift ${settings.afterShiftBufferMinutes}min.`,
        );
      }
    } catch {
      // settings unavailable
    }

    if (extraContext) {
      lines.push(`\nADDITIONAL CONTEXT FROM USER: ${extraContext}`);
    }

    return lines.join('\n');
  }
}
