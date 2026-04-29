import { Injectable } from '@nestjs/common';
import { PlanWeek, PlanWeekPhase } from '../plan-week/plan-week.entity';
import { PlannedSession, PlannedSessionIntensity, PlannedSessionPriority } from '../planned-session/planned-session.entity';
import { SchedulerSettings } from '../scheduler-settings/scheduler-settings.entity';
import { TrainingPlan } from '../training-plan/training-plan.entity';

type TemplateSession = {
  sessionType: string;
  purpose: string;
  priority: PlannedSessionPriority;
  duration: number;
  intensity: PlannedSessionIntensity;
  distanceTarget: number | null;
  paceBucket: 'easy' | 'tempo' | 'interval' | 'long' | null;
  substituteOptions: string[];
};

type LongRunProgression = {
  duration: number;
  distance: number;
} | null;

type SpeedWorkProgression = {
  type: 'tempo_run' | 'intervals';
  duration: number;
  distance: number | null;
} | null;

const CYCLE_PHASE_RULES = {
  menstrual: { maxIntensity: 'moderate', priorityOverride: 'supporting' },
  follicular: { maxIntensity: 'hard', preferred: true },
  ovulation: { maxIntensity: 'hard', injuryFlag: true },
  luteal: { maxIntensity: 'moderate' },
};

@Injectable()
export class PlanTemplateService {
  generateWeeksAndSessions(
    plan: TrainingPlan,
    settings: SchedulerSettings,
  ): {
    weeks: PlanWeek[];
    sessions: PlannedSession[];
  } {
    const totalWeeks = this.resolveTotalWeeks(plan);
    const planStartDate = this.resolvePlanStartDate(plan, totalWeeks);
    const raceMinutesPerKm = this.resolveRaceMinutesPerKm(plan);
    const availableDays = this.resolveAvailableDays(settings);

    const weeks: PlanWeek[] = [];
    const sessions: PlannedSession[] = [];

    for (let weekNumber = 1; weekNumber <= totalWeeks; weekNumber += 1) {
      const weekStart = this.addDays(planStartDate, (weekNumber - 1) * 7);
      const weekEnd = this.addDays(weekStart, 6);
      const phase = this.resolvePhase(plan, weekNumber, totalWeeks);
      const isDeload = this.isDeloadWeek(plan.mode, weekNumber, phase);

      const weeklyTemplate = this.getWeekSessions(
        weekNumber,
        phase,
        isDeload,
        plan.mode,
        totalWeeks,
        availableDays,
        raceMinutesPerKm,
      );

      const tempWeekId = `week-${weekNumber}`;
      const weekEntity = Object.assign(new PlanWeek(), {
        userId: plan.userId,
        planId: plan.id,
        weekNumber,
        phase,
        isDeload,
        volumeTarget: weeklyTemplate.reduce((sum, item) => sum + item.duration, 0),
        startDate: this.toDateString(weekStart),
        endDate: this.toDateString(weekEnd),
      });

      weeks.push(weekEntity);

      for (const template of weeklyTemplate) {
        const session = Object.assign(new PlannedSession(), {
          userId: plan.userId,
          planWeekId: tempWeekId,
          sessionType: template.sessionType,
          purpose: template.purpose,
          priority: template.priority,
          duration: template.duration,
          intensity: template.intensity,
          distanceTarget: template.distanceTarget,
          paceTarget: this.resolvePaceTarget(template.paceBucket, raceMinutesPerKm),
          skippable: template.priority !== 'key',
          shortenable: true,
          minimumDuration: Math.max(10, Math.floor((template.duration * 2) / 3)),
          substituteOptions: template.substituteOptions,
          missImpact: this.resolveMissImpact(template.priority),
          cyclePhaseRules: CYCLE_PHASE_RULES,
          status: 'pending',
          notes: null,
          completedAt: null,
          energyRating: null,
          linkedCalendarEventId: null,
        });

        sessions.push(session);
      }
    }

    return { weeks, sessions };
  }

  private resolveTotalWeeks(plan: TrainingPlan): number {
    if (plan.mode === 'race') {
      return plan.totalWeeks || 12;
    }

    return plan.totalWeeks || 8;
  }

  private resolvePlanStartDate(plan: TrainingPlan, totalWeeks: number): Date {
    if (plan.goalDate && plan.mode === 'race') {
      const goal = this.parseDate(plan.goalDate);
      if (goal) {
        const anchor = this.addDays(goal, -((totalWeeks - 1) * 7));
        return this.startOfWeek(anchor);
      }
    }

    return this.startOfWeek(new Date());
  }

  private resolveAvailableDays(_settings: SchedulerSettings): number {
    const dynamicSettings = _settings as unknown as Record<string, unknown>;
    const candidates = [
      dynamicSettings.availableDays,
      dynamicSettings.trainingDays,
      dynamicSettings.trainingDaysPerWeek,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'number' && Number.isFinite(candidate)) {
        return Math.min(7, Math.max(2, Math.round(candidate)));
      }
    }

    return 4;
  }

  private resolvePhase(plan: TrainingPlan, weekNumber: number, totalWeeks: number): PlanWeekPhase {
    if (plan.mode === 'race') {
      const taperWeeks = 2;
      const peakWeeks = 1;
      const baseWeeks = Math.min(5, Math.max(3, Math.round(totalWeeks * 0.33)));
      const buildWeeks = Math.max(1, totalWeeks - baseWeeks - peakWeeks - taperWeeks);
      const baseEnd = baseWeeks;
      const buildEnd = baseEnd + buildWeeks;
      const peakEnd = buildEnd + peakWeeks;

      if (weekNumber <= baseEnd) {
        return 'base';
      }
      if (weekNumber <= buildEnd) {
        return 'build';
      }
      if (weekNumber <= peakEnd) {
        return 'peak';
      }
      return 'taper';
    }

    return 'maintenance';
  }

  private getWeekSessions(
    weekNumber: number,
    phase: PlanWeekPhase,
    isDeload: boolean,
    mode: TrainingPlan['mode'],
    totalWeeks: number,
    availableDays: number,
    raceMinutesPerKm: number | null,
  ): TemplateSession[] {
    if (mode === 'race') {
      return this.generateRaceWeekTemplate(
        weekNumber,
        phase,
        isDeload,
        totalWeeks,
        availableDays,
        raceMinutesPerKm,
      );
    }

    if (mode === 'general_fitness') {
      return this.scaleByAvailableDays(
        this.generateGeneralFitnessTemplate(weekNumber, isDeload),
        availableDays,
        mode,
      );
    }

    return this.scaleByAvailableDays(this.generateWeightLossTemplate(weekNumber, isDeload), availableDays, mode);
  }

  private generateRaceWeekTemplate(
    weekNumber: number,
    phase: PlanWeekPhase,
    isDeload: boolean,
    totalWeeks: number,
    availableDays: number,
    raceMinutesPerKm: number | null,
  ): TemplateSession[] {
    const template: TemplateSession[] = [];

    const longRun = this.calculateLongRunProgression(weekNumber, totalWeeks, phase, isDeload);
    if (longRun) {
      template.push(
        this.session('long_run', 'endurance_progression', 'key', longRun.duration, 'moderate', longRun.distance, 'long', [
          'easy_run',
          'cross_train',
        ]),
      );
    }

    const speedWork = this.calculateSpeedWorkProgression(weekNumber, totalWeeks, phase, isDeload);
    if (speedWork) {
      template.push(
        this.session(
          speedWork.type,
          speedWork.type === 'tempo_run' ? 'threshold_build' : 'race_specific_speed',
          'key',
          speedWork.duration,
          speedWork.type === 'tempo_run' ? 'moderate' : 'hard',
          speedWork.distance,
          speedWork.type === 'tempo_run' ? 'tempo' : 'interval',
          ['easy_run'],
        ),
      );
    }

    const easyRunCount = this.resolveRaceEasyRunCount(weekNumber, totalWeeks, phase);
    const easyTemplate = this.resolveRaceEasyRunTemplate(weekNumber, totalWeeks, phase);
    for (let index = 0; index < easyRunCount; index += 1) {
      template.push(
        this.session(
          'easy_run',
          'aerobic_support',
          'supporting',
          easyTemplate.duration,
          'easy',
          easyTemplate.distance,
          'easy',
          ['walk', 'cross_train'],
        ),
      );
    }

    const strength = this.resolveRaceStrengthTemplate(weekNumber, totalWeeks, phase);
    if (strength) {
      template.push(
        this.session('strength_training', 'durability_and_injury_prevention', 'key', strength.duration, strength.intensity, null, null, [
          'mobility',
        ]),
      );
    }

    if (phase === 'build' || phase === 'peak' || phase === 'taper') {
      if (!(phase === 'taper' && weekNumber === totalWeeks)) {
        template.push(
          this.session('mobility', 'mobility_recovery', 'optional', 30, 'easy', null, null, ['yoga']),
        );
      }
    }

    if (isDeload) {
      const optionalYoga = template.filter((session) => session.sessionType === 'mobility');
      const nonYogaOptionalRemoved = template.filter((session) => session.priority !== 'optional');
      return this.scaleByAvailableDays([...nonYogaOptionalRemoved, ...optionalYoga], availableDays, 'race');
    }

    return this.scaleByAvailableDays(template, availableDays, 'race');
  }

  private generateGeneralFitnessTemplate(weekNumber: number, isDeload: boolean): TemplateSession[] {
    const templateWeek = Math.min(8, Math.max(1, weekNumber));

    let strengthDuration = 40;
    let cardioDuration = 35;
    let cardioDistance: number | null = 5;
    let mobilityDuration = 25;

    if (templateWeek >= 3 && templateWeek <= 4) {
      strengthDuration = 45;
      cardioDuration = 35;
      cardioDistance = 5;
      mobilityDuration = 25;
    } else if (templateWeek >= 5 && templateWeek <= 6) {
      strengthDuration = 50;
      cardioDuration = 40;
      cardioDistance = 6;
      mobilityDuration = 30;
    } else if (templateWeek >= 7) {
      strengthDuration = 50;
      cardioDuration = 40;
      cardioDistance = 6;
      mobilityDuration = 30;
    }

    if (isDeload) {
      strengthDuration = this.roundDuration(strengthDuration * 0.7);
      cardioDuration = this.roundDuration(cardioDuration * 0.7);
      mobilityDuration = this.roundDuration(mobilityDuration * 0.7);
      if (cardioDistance !== null) {
        cardioDistance = this.roundDistance(cardioDistance * 0.7);
      }
    }

    return [
      this.session('strength_training', 'strength_progression', 'key', strengthDuration, 'moderate', null, null, ['mobility']),
      this.session('strength_training', 'strength_progression', 'key', strengthDuration, 'moderate', null, null, ['mobility']),
      this.session('cardio_run', 'cardio_base', 'supporting', cardioDuration, 'moderate', cardioDistance, null, ['bike', 'row']),
      this.session('mobility', 'mobility_recovery', 'optional', mobilityDuration, 'easy', null, null, ['walk']),
    ];
  }

  private generateWeightLossTemplate(weekNumber: number, isDeload: boolean): TemplateSession[] {
    const templateWeek = Math.min(8, Math.max(1, weekNumber));

    let strengthDuration = 35;
    let cardioSessions: Array<{ duration: number; distance: number | null }> = [{ duration: 40, distance: 6 }];
    let hiitDuration = 20;

    if (templateWeek >= 3 && templateWeek <= 4) {
      strengthDuration = 40;
      cardioSessions = [{ duration: 45, distance: 7 }];
      hiitDuration = 25;
    } else if (templateWeek >= 5 && templateWeek <= 6) {
      strengthDuration = 40;
      cardioSessions = [
        { duration: 45, distance: 7 },
        { duration: 50, distance: 8 },
      ];
      hiitDuration = 25;
    } else if (templateWeek >= 7) {
      strengthDuration = 45;
      cardioSessions = [
        { duration: 45, distance: 7 },
        { duration: 50, distance: 8 },
      ];
      hiitDuration = 25;
    }

    if (isDeload) {
      strengthDuration = this.roundDuration(strengthDuration * 0.7);
      hiitDuration = this.roundDuration(hiitDuration * 0.7);
      cardioSessions = cardioSessions.map((session) => ({
        duration: this.roundDuration(session.duration * 0.7),
        distance: session.distance === null ? null : this.roundDistance(session.distance * 0.7),
      }));
    }

    const template: TemplateSession[] = [
      this.session('strength_training', 'muscle_preservation', 'key', strengthDuration, 'moderate', null, null, ['mobility']),
      this.session('strength_training', 'muscle_preservation', 'key', strengthDuration, 'moderate', null, null, ['mobility']),
      this.session('hiit', 'metabolic_boost', 'optional', hiitDuration, 'hard', null, null, ['tempo_run']),
    ];

    for (const cardio of cardioSessions) {
      template.push(
        this.session('cardio_run', 'fat_loss_aerobic', 'supporting', cardio.duration, 'moderate', cardio.distance, null, ['bike', 'walk']),
      );
    }

    return template;
  }

  private scaleByAvailableDays(
    template: TemplateSession[],
    availableDays: number,
    mode: TrainingPlan['mode'],
  ): TemplateSession[] {
    const sorted = [...template].sort((a, b) => this.priorityRank(a.priority) - this.priorityRank(b.priority));

    if (availableDays <= 2) {
      return sorted.slice(0, 2);
    }

    if (availableDays === 3) {
      return sorted.slice(0, 3);
    }

    if (availableDays === 4) {
      return sorted.slice(0, 4);
    }

    const expanded = [...sorted];
    const extraDays = availableDays - expanded.length;
    for (let index = 0; index < extraDays; index += 1) {
      if (mode === 'race') {
        expanded.push(
          this.session('easy_run', 'aerobic_support', 'supporting', 30, 'easy', 5, 'easy', ['cross_train']),
        );
      } else {
        expanded.push(
          this.session('mobility', 'mobility_recovery', 'optional', 25, 'easy', null, null, ['walk']),
        );
      }
    }

    return expanded;
  }

  private calculateLongRunProgression(
    weekNumber: number,
    totalWeeks: number,
    phase: PlanWeekPhase,
    isDeload: boolean,
  ): LongRunProgression {
    if (phase === 'taper') {
      if (weekNumber === totalWeeks) {
        return null;
      }

      return { duration: 60, distance: 10 };
    }

    if (phase === 'peak') {
      return { duration: 95, distance: 18 };
    }

    const loadIndex = this.resolveRaceLoadIndex(weekNumber, totalWeeks);
    const baselineDuration = Math.min(95, 60 + (loadIndex - 1) * 5);
    const baselineDistance = Math.min(16, 10 + Math.max(0, loadIndex - 1));

    if (!isDeload) {
      return {
        duration: this.roundDurationToFive(baselineDuration),
        distance: this.roundDistance(baselineDistance),
      };
    }

    return {
      duration: this.roundDurationToFive(baselineDuration * 0.7),
      distance: this.floorDistance(baselineDistance * 0.7),
    };
  }

  private calculateSpeedWorkProgression(
    weekNumber: number,
    totalWeeks: number,
    phase: PlanWeekPhase,
    _isDeload: boolean,
  ): SpeedWorkProgression {
    if (phase === 'base') {
      return null;
    }

    if (phase === 'peak') {
      return {
        type: 'intervals',
        duration: 50,
        distance: null,
      };
    }

    if (phase === 'taper') {
      if (weekNumber === totalWeeks - 1) {
        return {
          type: 'tempo_run',
          duration: 30,
          distance: 5,
        };
      }

      return null;
    }

    const buildIndex = this.weekIndexInPhase('build', weekNumber, totalWeeks);
    const totalBuildWeeks = this.totalWeeksInPhase('build', totalWeeks);
    const isTempoWeek = buildIndex % 2 === 1;

    if (isTempoWeek) {
      const tempoOrdinal = Math.ceil(buildIndex / 2);
      const totalTempoSlots = Math.max(1, Math.ceil(totalBuildWeeks / 2));

      return {
        type: 'tempo_run',
        duration: this.interpolate(35, 45, tempoOrdinal, totalTempoSlots),
        distance: this.roundDistance(this.interpolate(6, 8, tempoOrdinal, totalTempoSlots)),
      };
    }

    const intervalOrdinal = Math.floor(buildIndex / 2);
    const totalIntervalSlots = Math.max(1, Math.floor(totalBuildWeeks / 2));

    return {
      type: 'intervals',
      duration: this.interpolate(35, 45, intervalOrdinal, totalIntervalSlots),
      distance: null,
    };
  }

  private resolveRaceEasyRunCount(weekNumber: number, totalWeeks: number, phase: PlanWeekPhase): number {
    if (phase === 'base') {
      return 2;
    }

    if (phase === 'build' || phase === 'peak') {
      return 1;
    }

    if (phase === 'taper') {
      return weekNumber === totalWeeks ? 1 : 2;
    }

    return 1;
  }

  private resolveRaceEasyRunTemplate(
    _weekNumber: number,
    totalWeeks: number,
    phase: PlanWeekPhase,
  ): { duration: number; distance: number } {
    if (phase === 'taper') {
      return {
        duration: 25,
        distance: 4,
      };
    }

    return {
      duration: totalWeeks >= 12 ? 35 : 30,
      distance: totalWeeks >= 12 ? 6 : 5,
    };
  }

  private resolveRaceStrengthTemplate(
    weekNumber: number,
    totalWeeks: number,
    phase: PlanWeekPhase,
  ): { duration: number; intensity: PlannedSessionIntensity } | null {
    if (phase === 'taper' && weekNumber === totalWeeks) {
      return null;
    }

    if (phase === 'taper') {
      return {
        duration: 30,
        intensity: 'easy',
      };
    }

    if (phase === 'peak') {
      return {
        duration: 45,
        intensity: 'moderate',
      };
    }

    return {
      duration: phase === 'base' ? 45 : 50,
      intensity: 'moderate',
    };
  }

  private resolveRaceMinutesPerKm(plan: TrainingPlan): number | null {
    if (plan.mode !== 'race' || !plan.goalTime) {
      return null;
    }

    const minutes = this.parseTimeToMinutes(plan.goalTime);
    const distanceKm = this.parseDistanceToKm(plan.goalDistance);
    if (minutes === null || distanceKm === null || distanceKm <= 0) {
      return null;
    }

    return minutes / distanceKm;
  }

  private parseTimeToMinutes(goalTime: string): number | null {
    const parts = goalTime.split(':').map((value) => Number(value.trim()));
    if (parts.some((value) => Number.isNaN(value))) {
      return null;
    }

    if (parts.length === 2) {
      const [hours, minutes] = parts;
      return hours * 60 + minutes;
    }

    if (parts.length === 3) {
      const [hours, minutes, seconds] = parts;
      return hours * 60 + minutes + seconds / 60;
    }

    return null;
  }

  private parseDistanceToKm(goalDistance?: string): number | null {
    if (!goalDistance) {
      return null;
    }

    const normalized = goalDistance.toLowerCase();
    if (normalized.includes('half')) {
      return 21.1;
    }
    if (normalized.includes('marathon')) {
      return 42.2;
    }
    if (normalized.includes('10k')) {
      return 10;
    }
    if (normalized.includes('5k')) {
      return 5;
    }

    const match = normalized.match(/\d+(\.\d+)?/);
    if (!match) {
      return null;
    }

    return Number(match[0]);
  }

  private resolvePaceTarget(bucket: 'easy' | 'tempo' | 'interval' | 'long' | null, raceMinutesPerKm: number | null): string | null {
    if (!bucket || raceMinutesPerKm === null) {
      return null;
    }

    if (bucket === 'easy' || bucket === 'long') {
      return `${this.formatPace(raceMinutesPerKm + 1.25)} /km`;
    }

    if (bucket === 'tempo') {
      return `${this.formatPace(raceMinutesPerKm + 0.1667)} /km`;
    }

    return `${this.formatPace(raceMinutesPerKm - 0.25)} /km`;
  }

  private isDeloadWeek(mode: TrainingPlan['mode'], weekNumber: number, phase: PlanWeekPhase): boolean {
    if (mode === 'race') {
      return weekNumber % 4 === 0 && phase !== 'peak' && phase !== 'taper';
    }

    return weekNumber % 4 === 0;
  }

  private resolveRaceLoadIndex(weekNumber: number, totalWeeks: number): number {
    let loadIndex = 0;

    for (let currentWeek = 1; currentWeek <= weekNumber; currentWeek += 1) {
      const phase = this.resolvePhase({ mode: 'race' } as TrainingPlan, currentWeek, totalWeeks);
      const deload = this.isDeloadWeek('race', currentWeek, phase);
      if ((phase === 'base' || phase === 'build') && !deload) {
        loadIndex += 1;
      }
    }

    return Math.max(1, loadIndex);
  }

  private totalWeeksInPhase(phase: PlanWeekPhase, totalWeeks: number): number {
    let count = 0;
    for (let weekNumber = 1; weekNumber <= totalWeeks; weekNumber += 1) {
      const resolved = this.resolvePhase({ mode: 'race' } as TrainingPlan, weekNumber, totalWeeks);
      if (resolved === phase) {
        count += 1;
      }
    }
    return count;
  }

  private weekIndexInPhase(phase: PlanWeekPhase, weekNumber: number, totalWeeks: number): number {
    let index = 0;
    for (let currentWeek = 1; currentWeek <= weekNumber; currentWeek += 1) {
      const resolved = this.resolvePhase({ mode: 'race' } as TrainingPlan, currentWeek, totalWeeks);
      if (resolved === phase) {
        index += 1;
      }
    }
    return Math.max(1, index);
  }

  private interpolate(start: number, end: number, index: number, total: number): number {
    if (total <= 1) {
      return this.roundDuration(end);
    }

    const progress = Math.max(0, Math.min(1, (index - 1) / (total - 1)));
    const value = start + (end - start) * progress;
    return this.roundDuration(value);
  }

  private priorityRank(priority: PlannedSessionPriority): number {
    if (priority === 'key') {
      return 0;
    }
    if (priority === 'supporting') {
      return 1;
    }
    return 2;
  }

  private roundDurationToFive(value: number): number {
    return Math.max(15, Math.round(value / 5) * 5);
  }

  private formatPace(minutesPerKm: number): string {
    const safe = Math.max(3, minutesPerKm);
    const minutes = Math.floor(safe);
    const seconds = Math.round((safe - minutes) * 60);
    const normalizedMinutes = seconds === 60 ? minutes + 1 : minutes;
    const normalizedSeconds = seconds === 60 ? 0 : seconds;
    return `${normalizedMinutes}:${String(normalizedSeconds).padStart(2, '0')}`;
  }

  private resolveMissImpact(priority: PlannedSessionPriority): 'high' | 'medium' | 'low' {
    if (priority === 'key') {
      return 'high';
    }
    if (priority === 'supporting') {
      return 'medium';
    }
    return 'low';
  }

  private session(
    sessionType: string,
    purpose: string,
    priority: PlannedSessionPriority,
    duration: number,
    intensity: PlannedSessionIntensity,
    distanceTarget: number | null,
    paceBucket: 'easy' | 'tempo' | 'interval' | 'long' | null,
    substituteOptions: string[],
  ): TemplateSession {
    return {
      sessionType,
      purpose,
      priority,
      duration,
      intensity,
      distanceTarget,
      paceBucket,
      substituteOptions,
    };
  }

  private startOfWeek(date: Date): Date {
    const copy = new Date(date);
    const day = copy.getDay();
    const diff = (day + 6) % 7;
    copy.setDate(copy.getDate() - diff);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  private parseDate(value: string): Date | null {
    if (!value) {
      return null;
    }

    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed;
  }

  private addDays(date: Date, days: number): Date {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  private toDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private roundDuration(value: number): number {
    return Math.max(15, Math.round(value));
  }

  private roundDistance(value: number): number {
    return Math.max(1, Math.round(value));
  }

  private floorDistance(value: number): number {
    return Math.max(1, Math.floor(value));
  }
}