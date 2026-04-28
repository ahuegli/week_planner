import { BadRequestException, Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PlanWeek, PlanWeekPhase } from '../plan-week/plan-week.entity';
import {
  PlannedSession,
  PlannedSessionDiscipline,
  PlannedSessionIntensity,
  PlannedSessionPriority,
} from '../planned-session/planned-session.entity';
import { SchedulerSettings } from '../scheduler-settings/scheduler-settings.entity';
import { TrainingPlan, TriathlonDistance } from '../training-plan/training-plan.entity';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TriTier = 'tier4plus' | 'tier3';
export type TriExperienceLevel = 'true_beginner' | 'tri_novice_but_fit' | 'intermediate' | 'experienced';
export type TriPoolAccess = '25m' | '50m' | 'open_water' | 'pool_and_open_water' | 'none';
export type TriPeriodisation = 'traditional' | 'reverse';
export type TriEndurancePedigree = 'none' | 'runner' | 'cyclist' | 'swimmer' | 'multiple';
type PhaseLabel = 'base' | 'build' | 'peak' | 'taper';

export interface TriCalibrationData {
  ftpWatts: number | null;
  lthrBpm: number | null;
  cssSecondsPer100m: number | null;
  hasPowerMeter: boolean;
}

export interface TriathlonPlanParams {
  distance: TriathlonDistance;
  weeklyHours: number;
  tier: TriTier;
  experienceLevel: TriExperienceLevel;
  periodisation: TriPeriodisation;
  calibration: TriCalibrationData;
  poolAccess: TriPoolAccess;
}

type SwimIntent = 'technique' | 'threshold' | 'endurance';
type BikeIntent = 'intervals' | 'sweet_spot' | 'long' | 'race_pace';
type RunIntent = 'quality' | 'easy' | 'long';

interface TriTemplateSession {
  sessionType: string;
  purpose: string;
  priority: PlannedSessionPriority;
  baseDuration: number;
  intensity: PlannedSessionIntensity;
  discipline: PlannedSessionDiscipline;
  distanceTargetKm: number | null;
  substituteOptions: string[];
  swimIntent?: SwimIntent;
  bikeIntent?: BikeIntent;
  runIntent?: RunIntent;
  brickGroupId?: string;
  isBrickRun?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Per methodology 'Frequency tiers' — Tier 3 caps at 7 sessions/week. 140.6 requires Tier 4+. Null = not offered.
// WP12B: Tier 4+ counts include brick_run (+1 vs pre-WP12B). For 70.3/140.6, race-rehearsal weeks drop
// standalone run_long so net count returns to pre-WP12B value (10/11). Non-rehearsal and taper weeks are +1.
const SESSIONS_PER_WEEK: Record<TriTier, Partial<Record<TriathlonDistance, number | null>>> = {
  tier4plus: { sprint: 10, olympic: 10, '70_3': 11, '140_6': 12 },
  tier3: { sprint: 7, olympic: 7, '70_3': 7, '140_6': null },
};

// Per methodology 'Plan length' — sprint 10-12w, olympic 14-16w, 70.3 20-24w, 140.6 27-36w. Default is mid-point of methodology range.
const PLAN_LENGTH_DEFAULT: Record<TriathlonDistance, number> = {
  sprint: 10, olympic: 14, '70_3': 20, '140_6': 27,
};
const PLAN_LENGTH_MIN: Record<TriathlonDistance, number> = {
  sprint: 8, olympic: 12, '70_3': 16, '140_6': 24,
};
const PLAN_LENGTH_MAX: Record<TriathlonDistance, number> = {
  sprint: 12, olympic: 16, '70_3': 24, '140_6': 36,
};

// Per methodology 'Taper' — sprint 1w, olympic 2w, 70.3/140.6 3w. Peak phase only exists for sprint/olympic; longer distances go base→build→taper.
const TAPER_WEEKS: Record<TriathlonDistance, number> = {
  sprint: 1, olympic: 2, '70_3': 3, '140_6': 3,
};
const PEAK_WEEKS: Record<TriathlonDistance, number> = {
  sprint: 1, olympic: 1, '70_3': 0, '140_6': 0,
};

// Per methodology 'Periodisation phases' — base is 33-42% of working weeks (after taper+peak). 140.6 gets higher base fraction due to aerobic volume dependency.
const BASE_FRACTION: Record<TriathlonDistance, number> = {
  sprint: 0.36, olympic: 0.33, '70_3': 0.37, '140_6': 0.42,
};

// Per methodology 'Weekly hours by tier/distance' — standard hours are the mid-point of each range used as the scaling baseline (1.0 scaler = these hours).
const STANDARD_WEEKLY_HOURS: Record<TriTier, Record<TriathlonDistance, number>> = {
  tier4plus: { sprint: 8, olympic: 10, '70_3': 12, '140_6': 16 },
  tier3: { sprint: 5, olympic: 7, '70_3': 8, '140_6': 8 },
};

// Per methodology 'Volume and intensity': taper drops to ~60% volume (intensity maintained). Peak is high-intensity low-volume. Build is +15% vs base.
const PHASE_VOLUME_SCALER: Record<PhaseLabel, number> = {
  base: 1.0, build: 1.15, peak: 0.9, taper: 0.6,
};

// Swim volume bases in meters per session by distance
const SWIM_BASE_METERS: Record<TriathlonDistance, Record<SwimIntent, number>> = {
  sprint: { technique: 1600, threshold: 1800, endurance: 2000 },
  olympic: { technique: 2000, threshold: 2200, endurance: 2500 },
  '70_3': { technique: 2200, threshold: 2800, endurance: 3200 },
  '140_6': { technique: 2500, threshold: 3200, endurance: 4000 },
};

const CYCLE_PHASE_RULES = {
  menstrual: { maxIntensity: 'moderate', priorityOverride: 'supporting' },
  follicular: { maxIntensity: 'hard', preferred: true },
  ovulation: { maxIntensity: 'hard', injuryFlag: true },
  luteal: { maxIntensity: 'moderate' },
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class TriathlonPlanTemplateService {

  // -- Static helpers (called by Part 3A controller) -------------------------

  static computeExperienceLevel(
    triathlonsCompleted: number | null,
    endurancePedigree: TriEndurancePedigree | null,
  ): TriExperienceLevel {
    const completed = triathlonsCompleted ?? 0;
    const pedigree = endurancePedigree ?? 'none';
    if (completed >= 3) return 'experienced';
    if (completed >= 1) return 'intermediate';
    if (pedigree === 'none') return 'true_beginner';
    return 'tri_novice_but_fit';
  }

  static defaultPeriodisation(
    experience: TriExperienceLevel,
    distance: TriathlonDistance,
    override: TriPeriodisation | null,
  ): TriPeriodisation {
    // Judgment call: override ALWAYS wins regardless of experience level or distance.
    // This is intentional — user override is explicit preference, not a mistake.
    if (override) return override;
    // Sprint and olympic always use traditional base-build periodisation
    if (distance === 'sprint' || distance === 'olympic') return 'traditional';
    // Per methodology 'Periodisation models' — experienced athletes on long-course benefit from
    // reverse periodisation (intensity-first). Beginners need aerobic base first.
    if (experience === 'experienced') return 'reverse';
    return 'traditional';
  }

  // -- Main entry point -------------------------------------------------------

  generateWeeksAndSessions(
    plan: TrainingPlan,
    settings: SchedulerSettings,
    params: TriathlonPlanParams,
  ): { weeks: PlanWeek[]; sessions: PlannedSession[] } {
    const { distance, tier, weeklyHours, calibration, poolAccess, periodisation } = params;

    // Per methodology 'Frequency tiers' — Tier 3 (≤7 sessions) cannot support the volume
    // required for 140.6. Caller should have validated this, but guard here as hard backstop.
    if (tier === 'tier3' && distance === '140_6') {
      throw new BadRequestException(
        'Ironman 140.6 requires Tier 4+ (8+ sessions/week). At Tier 3, choose sprint or olympic distance.',
      );
    }

    const totalWeeks = this.resolveTotalWeeks(plan);
    const planStartDate = this.resolvePlanStartDate(plan, totalWeeks);
    const hasRaceDate = !!(plan.goalDate && plan.mode === 'race');

    const weeks: PlanWeek[] = [];
    const sessions: PlannedSession[] = [];

    for (let weekNumber = 1; weekNumber <= totalWeeks; weekNumber++) {
      const weekStart = this.addDays(planStartDate, (weekNumber - 1) * 7);
      const weekEnd = this.addDays(weekStart, 6);

      // Per methodology: without a race date (general fitness mode), we skip phase resolution
      // and hold the user permanently in 'build' with deload every 4th week.
      // Judgment call: 'base' would be more conservative but 'build' keeps the plan from feeling static.
      const phase: PhaseLabel = hasRaceDate
        ? this.resolvePhase(distance, weekNumber, totalWeeks)
        : 'build';
      const isDeload = this.isDeloadWeek(weekNumber, phase);

      const templateSessions = this.getWeekSessions(
        weekNumber, totalWeeks, phase, isDeload,
        tier, distance, weeklyHours, periodisation,
      );

      const tempWeekId = `week-${weekNumber}`;
      const weekEntity = Object.assign(new PlanWeek(), {
        userId: plan.userId,
        planId: plan.id,
        weekNumber,
        phase: phase as PlanWeekPhase,
        isDeload,
        volumeTarget: templateSessions.reduce((sum, s) => sum + s.duration, 0),
        startDate: this.toDateString(weekStart),
        endDate: this.toDateString(weekEnd),
      });

      weeks.push(weekEntity);

      // Brick pair tracking: Map<brickGroupId, [bikeSession, runSession]>
      // Populated during the loop, then linked in a post-pass before adding to sessions[].
      const weekBrickGroups = new Map<string, PlannedSession[]>();
      const weekSessions: PlannedSession[] = [];

      for (const tmpl of templateSessions) {
        const session = Object.assign(new PlannedSession(), {
          userId: plan.userId,
          planWeekId: tempWeekId,
          sessionType: tmpl.sessionType,
          purpose: tmpl.purpose,
          priority: tmpl.priority,
          duration: tmpl.duration,
          intensity: tmpl.intensity,
          distanceTarget: tmpl.distanceTargetKm,
          paceTarget: null,
          skippable: tmpl.priority !== 'key',
          shortenable: true,
          minimumDuration: Math.max(15, Math.floor(tmpl.duration * 0.66)),
          substituteOptions: tmpl.substituteOptions,
          missImpact: tmpl.priority === 'key' ? 'high' : tmpl.priority === 'supporting' ? 'medium' : 'low',
          discipline: tmpl.discipline,
          prescriptionData: this.buildPrescription(tmpl, phase, distance, calibration, poolAccess, weeklyHours),
          cyclePhaseRules: CYCLE_PHASE_RULES,
          status: 'pending',
          notes: null,
          completedAt: null,
          energyRating: null,
          linkedCalendarEventId: null,
          linkedNextSessionId: null,
          linkedPriorSessionId: null,
          isCarryForward: false,
          originalWeekNumber: null,
        });

        // Pre-assign UUID so we can cross-link brick pairs before DB save
        if (tmpl.brickGroupId) {
          session.id = uuidv4();
          const group = weekBrickGroups.get(tmpl.brickGroupId) ?? [];
          group.push(session);
          weekBrickGroups.set(tmpl.brickGroupId, group);
        }

        weekSessions.push(session);
      }

      // Link brick pairs: bike.linkedNextSessionId ↔ run.linkedPriorSessionId
      // buildBrickPair always returns [bike, run] in that order, so index 0=bike, 1=run.
      for (const [groupId, pair] of weekBrickGroups) {
        if (pair.length !== 2) {
          console.warn(
            `[TriathlonPlanTemplate] Brick group ${groupId} has ${pair.length} session(s) — expected 2. Skipping link.`,
          );
          continue;
        }
        const [bike, run] = pair;
        bike.linkedNextSessionId = run.id;
        run.linkedPriorSessionId = bike.id;
      }

      sessions.push(...weekSessions);
    }

    return { weeks, sessions };
  }

  // -- Phase resolution -------------------------------------------------------

  private resolvePhase(distance: TriathlonDistance, weekNumber: number, totalWeeks: number): PhaseLabel {
    const taperWeeks = TAPER_WEEKS[distance];
    const peakWeeks = PEAK_WEEKS[distance];
    const taperStart = totalWeeks - taperWeeks + 1;
    const peakStart = taperStart - peakWeeks;

    if (weekNumber >= taperStart) return 'taper';
    if (peakWeeks > 0 && weekNumber >= peakStart) return 'peak';

    const remainingWeeks = totalWeeks - taperWeeks - peakWeeks;
    const baseWeeks = Math.max(2, Math.round(remainingWeeks * BASE_FRACTION[distance]));

    return weekNumber <= baseWeeks ? 'base' : 'build';
  }

  private isDeloadWeek(weekNumber: number, phase: PhaseLabel): boolean {
    // Per methodology 'Deload weeks' — every 4th week at 70% volume. Peak and taper handle
    // their own volume reduction via PHASE_VOLUME_SCALER; applying deload on top would over-reduce.
    return weekNumber % 4 === 0 && phase !== 'peak' && phase !== 'taper';
  }

  // -- Weekly session template ------------------------------------------------

  private getWeekSessions(
    weekNumber: number,
    totalWeeks: number,
    phase: PhaseLabel,
    isDeload: boolean,
    tier: TriTier,
    distance: TriathlonDistance,
    weeklyHours: number,
    periodisation: TriPeriodisation,
  ): (TriTemplateSession & { duration: number })[] {
    const brickVariant = this.computeBrickVariant(distance, phase, weekNumber, totalWeeks);
    const templates: TriTemplateSession[] = tier === 'tier4plus'
      ? this.tier4PlusTemplate(distance, phase, brickVariant)
      : this.tier3Template(distance, phase, brickVariant);

    // Duration scaling: hour scaler × progression scaler × deload scaler
    const stdHours = STANDARD_WEEKLY_HOURS[tier][distance];
    // Scaler capped at 1.5× (50% above standard) to prevent session durations becoming unworkable.
    // Capped at 0.65× minimum to preserve minimum viable session quality at low-hour inputs.
    const hourScaler = Math.min(1.5, Math.max(0.65, weeklyHours / stdHours));
    // progressionScaler replaces the old flat PHASE_VOLUME_SCALER — it ramps linearly within each
    // phase so volume builds toward peak rather than jumping to a fixed phase multiplier.
    const progressionScaler = this.computeProgressionScaler(weekNumber, phase, distance, totalWeeks);
    const deloadScaler = isDeload ? 0.70 : 1.0;

    // Per methodology 'Periodisation models — reverse': reverse periodisation does NOT change volume,
    // only zone emphasis. The 1.05 bias in build nudges slightly more time-in-zone for experienced
    // athletes who already have aerobic base. Judgment call: this is a minor bias, not a full swap.
    // Volume remains the same — only session intent shifts (handled in prescriptionData)
    // Phase weighting adjusts in the reverse case: build phase gets slightly more volume early
    const reverseBias = periodisation === 'reverse' && phase === 'build' ? 1.05 : 1.0;
    const totalScaler = hourScaler * progressionScaler * deloadScaler * reverseBias;

    return templates.map(t => ({
      ...t,
      duration: Math.max(20, Math.round(t.baseDuration * totalScaler)),
      distanceTargetKm: t.distanceTargetKm
        ? Math.round(t.distanceTargetKm * totalScaler * 10) / 10
        : null,
    }));
  }

  // -- Tier 4+ template (sprint=10, olympic=10, 70.3=10-11, 140.6=11-12) -----
  // WP12B: bike_long replaced by brick pair. run_long dropped on race-rehearsal weeks for 70.3/140.6
  // (brick run IS the long-run-equivalent those weeks). All other weeks keep standalone run_long.

  private tier4PlusTemplate(
    distance: TriathlonDistance,
    phase: PhaseLabel,
    brickVariant: 'transition' | 'race_sim' | 'race_rehearsal',
  ): TriTemplateSession[] {
    const longBikeDuration = { sprint: 120, olympic: 140, '70_3': 195, '140_6': 240 }[distance];
    const longRunDuration = { sprint: 75, olympic: 90, '70_3': 110, '140_6': 130 }[distance];

    // Race-rehearsal weeks for long-course: brick run IS the long run → drop standalone run_long
    const isLong = distance === '70_3' || distance === '140_6';
    const includeStandaloneRunLong = !(isLong && brickVariant === 'race_rehearsal');

    const sessions: TriTemplateSession[] = [
      // Swim × 3
      this.triSession('swim', 'swim_technique', 'key', 40, 'moderate', 'swim', null,
        ['cross_train'], 'technique'),
      this.triSession('swim', 'swim_threshold', 'key', 50, 'hard', 'swim', null,
        ['cross_train'], 'threshold'),
      this.triSession('swim', 'swim_endurance', 'supporting', 45, 'moderate', 'swim', null,
        ['cross_train'], 'endurance'),

      // Bike intervals
      this.triSession('bike', 'bike_intervals', 'key', 70, 'hard', 'bike', null,
        ['swim', 'cross_train'], undefined, 'intervals'),

      // Brick pair: bike_long replaced by linked brick (bike + brick_run same day)
      ...this.buildBrickPair(distance, phase, longBikeDuration, brickVariant),

      // Run
      this.triSession('run', 'run_quality', 'key', 45, 'hard', 'run', null,
        ['bike_intervals'], undefined, undefined, 'quality'),
      this.triSession('run', 'run_easy', 'supporting', 35, 'easy', 'run', null,
        ['swim', 'walk'], undefined, undefined, 'easy'),
      ...(includeStandaloneRunLong
        ? [this.triSession('run', 'run_long', 'key', longRunDuration, 'moderate', 'run', null,
            [], undefined, undefined, 'long')]
        : []),

      // Per methodology 'Strength training' — strength is never zeroed, not even in taper.
      this.triSession('strength', 'strength_posterior_chain', 'key', 45, 'moderate', 'strength', null,
        ['mobility']),
    ];

    // Per methodology 'Strength training' — 70.3 and 140.6 get 2× strength per week at Tier 4+.
    if (distance === '70_3') {
      sessions.push(
        this.triSession('strength', 'strength_posterior_chain', 'supporting', 40, 'moderate', 'strength', null,
          ['mobility']),
      );
    }

    // 140.6: add 2nd strength + 3rd swim
    if (distance === '140_6') {
      sessions.push(
        this.triSession('strength', 'strength_posterior_chain', 'supporting', 40, 'moderate', 'strength', null,
          ['mobility']),
        this.triSession('swim', 'swim_aerobic', 'supporting', 50, 'easy', 'swim', null,
          ['cross_train'], 'endurance'),
      );
    }

    // Per methodology 'Taper': supporting sessions become optional.
    if (phase === 'taper') {
      return sessions.map(s => ({
        ...s,
        priority: s.priority === 'supporting' ? 'optional' : s.priority,
      }));
    }

    return sessions;
  }

  // -- Tier 3 template (sprint=7, olympic=7, 70.3=7) -------------------------
  // Per methodology 'Frequency tiers — Tier 3': 2 swim, 2 bike, 2 run, 1 strength.
  // WP12B: brick pair replaces bike_long + run_long (brick run IS the long run at Tier 3 volume budget).
  // Net row count stays 7 (was 7: 2+2+2+1; now 7: 2+1+brick_bike+brick_run+1+1).

  private tier3Template(
    distance: TriathlonDistance,
    phase: PhaseLabel,
    brickVariant: 'transition' | 'race_sim' | 'race_rehearsal',
  ): TriTemplateSession[] {
    const longBikeDuration = { sprint: 110, olympic: 130, '70_3': 170, '140_6': 0 }[distance];

    const sessions: TriTemplateSession[] = [
      // Swim × 2
      this.triSession('swim', 'swim_technique', 'key', 35, 'moderate', 'swim', null,
        ['cross_train'], 'technique'),
      this.triSession('swim', 'swim_threshold', 'key', 45, 'hard', 'swim', null,
        ['cross_train'], 'threshold'),

      // Bike intervals
      this.triSession('bike', 'bike_intervals', 'key', 65, 'hard', 'bike', null,
        ['swim'], undefined, 'intervals'),

      // Brick pair: replaces bike_long + run_long (brick run IS the long run at this tier)
      ...this.buildBrickPair(distance, phase, longBikeDuration, brickVariant),

      // Run quality (standalone; long run absorbed into brick)
      this.triSession('run', 'run_quality', 'key', 45, 'hard', 'run', null,
        ['bike'], undefined, undefined, 'quality'),

      // Strength × 1
      this.triSession('strength', 'strength_posterior_chain', 'supporting', 45, 'moderate', 'strength', null,
        ['mobility']),
    ];

    if (phase === 'taper') {
      return sessions.map(s => ({
        ...s,
        priority: s.priority === 'supporting' ? 'optional' : s.priority,
      }));
    }

    return sessions;
  }

  // -- Volume progression scaler ----------------------------------------------

  // Returns a scaler that ramps linearly within each phase, so volume builds
  // progressively rather than jumping to a flat phase multiplier.
  // Ranges per phase: base 0.70→1.00, build 0.90→1.15, peak 1.05→1.15, taper 1.00→0.50.
  // Deload is applied on top via a separate deloadScaler in getWeekSessions().
  private computeProgressionScaler(
    weekNumber: number,
    phase: PhaseLabel,
    distance: TriathlonDistance,
    totalWeeks: number,
  ): number {
    const taperWeeks = TAPER_WEEKS[distance];
    const peakWeeks = PEAK_WEEKS[distance];
    const taperStart = totalWeeks - taperWeeks + 1;
    const peakStart = taperStart - peakWeeks;
    const remainingWeeks = totalWeeks - taperWeeks - peakWeeks;
    const baseWeeks = Math.max(2, Math.round(remainingWeeks * BASE_FRACTION[distance]));

    let phaseStart: number;
    let phaseEnd: number;

    switch (phase) {
      case 'base':
        phaseStart = 1;
        phaseEnd = baseWeeks;
        break;
      case 'build':
        phaseStart = baseWeeks + 1;
        phaseEnd = peakWeeks > 0 ? peakStart - 1 : taperStart - 1;
        break;
      case 'peak':
        phaseStart = peakStart;
        phaseEnd = taperStart - 1;
        break;
      default: // taper
        phaseStart = taperStart;
        phaseEnd = totalWeeks;
        break;
    }

    const phaseDuration = phaseEnd - phaseStart;
    // t ∈ [0, 1]: 0 = first week of phase, 1 = last week. Clamped for general-fitness
    // mode where all weeks are 'build' regardless of computed phase boundaries.
    const t = phaseDuration <= 0
      ? 0
      : Math.max(0, Math.min(1, (weekNumber - phaseStart) / phaseDuration));

    const PHASE_RAMP: Record<PhaseLabel, [number, number]> = {
      base:  [0.70, 1.00],
      build: [0.90, 1.15],
      peak:  [1.05, 1.15],
      taper: [1.00, 0.50],
    };

    const [lo, hi] = PHASE_RAMP[phase];
    return lo + t * (hi - lo);
  }

  // -- Brick variant / pair builders ------------------------------------------

  private computeBrickVariant(
    distance: TriathlonDistance,
    phase: PhaseLabel,
    weekNumber: number,
    totalWeeks: number,
  ): 'transition' | 'race_sim' | 'race_rehearsal' {
    if (phase === 'base') return 'transition';
    if (phase === 'peak' || phase === 'taper') return 'race_sim';
    // Build phase
    if (distance === 'sprint' || distance === 'olympic') return 'race_sim';
    // Long-course build: last N weeks are race-rehearsal (full-volume brick, replaces run_long)
    const rehearsalCount = distance === '140_6' ? 3 : 2;
    const buildEndWeek = totalWeeks - TAPER_WEEKS[distance] - PEAK_WEEKS[distance];
    return weekNumber >= buildEndWeek - rehearsalCount + 1 ? 'race_rehearsal' : 'race_sim';
  }

  private buildBrickPair(
    distance: TriathlonDistance,
    phase: PhaseLabel,
    longBikeDuration: number,
    brickVariant: 'transition' | 'race_sim' | 'race_rehearsal',
  ): TriTemplateSession[] {
    const groupId = `brick-${uuidv4().slice(0, 8)}`;
    const isLong = distance === '70_3' || distance === '140_6';
    const priority: PlannedSessionPriority = phase === 'taper' ? 'optional' : 'key';

    let bikeDuration: number;
    let runDuration: number;
    let bikeIntent: BikeIntent;
    let runIntentVal: RunIntent;
    let intensity: PlannedSessionIntensity;

    switch (brickVariant) {
      case 'transition':
        // Short additive brick — base phase
        bikeDuration = isLong ? 45 : 30;
        runDuration = isLong ? 20 : 15;
        bikeIntent = 'sweet_spot';
        runIntentVal = 'easy';
        intensity = 'easy';
        break;
      case 'race_rehearsal':
        // Full-volume race-rehearsal — last build weeks for 70.3/140.6 only
        bikeDuration = longBikeDuration;
        runDuration = distance === '140_6' ? 90 : 60;
        bikeIntent = 'long';
        runIntentVal = 'quality';
        intensity = 'moderate';
        break;
      case 'race_sim':
      default:
        // Race-simulation — build/peak for sprint/olympic; non-rehearsal build for 70.3/140.6
        bikeDuration = isLong ? (distance === '140_6' ? 120 : 90) : (distance === 'sprint' ? 65 : 80);
        runDuration = isLong ? (distance === '140_6' ? 45 : 35) : (distance === 'sprint' ? 25 : 40);
        bikeIntent = 'race_pace';
        runIntentVal = 'quality';
        intensity = 'moderate';
        break;
    }

    return [
      {
        sessionType: 'bike', purpose: 'brick_bike', priority,
        baseDuration: bikeDuration, intensity, discipline: 'bike',
        distanceTargetKm: null, substituteOptions: [], bikeIntent,
        brickGroupId: groupId,
      },
      {
        sessionType: 'run', purpose: 'brick_run', priority,
        baseDuration: runDuration, intensity, discipline: 'run',
        distanceTargetKm: null, substituteOptions: [], runIntent: runIntentVal,
        brickGroupId: groupId, isBrickRun: true,
      },
    ];
  }

  // -- Prescription builder ---------------------------------------------------

  private buildPrescription(
    tmpl: TriTemplateSession,
    phase: PhaseLabel,
    distance: TriathlonDistance,
    calibration: TriCalibrationData,
    poolAccess: TriPoolAccess,
    weeklyHours: number,
  ): Record<string, unknown> {
    if (tmpl.isBrickRun) {
      return this.prescribeBrickRunSession(phase, distance);
    }
    if (tmpl.discipline === 'swim' && tmpl.swimIntent) {
      return this.prescribeSwimSession(tmpl.swimIntent, phase, distance, calibration, poolAccess, tmpl.baseDuration);
    }
    if (tmpl.discipline === 'bike' && tmpl.bikeIntent) {
      return this.prescribeBikeSession(tmpl.bikeIntent, phase, distance, calibration);
    }
    if (tmpl.discipline === 'run' && tmpl.runIntent) {
      return this.prescribeRunSession(tmpl.runIntent, phase, distance);
    }
    if (tmpl.discipline === 'strength') {
      return this.prescribeStrengthSession(distance);
    }
    return {};
  }

  // -- Brick run prescription -------------------------------------------------

  private prescribeBrickRunSession(
    phase: PhaseLabel,
    distance: TriathlonDistance,
  ): Record<string, unknown> {
    const durationNote = distance === '140_6'
      ? 'Long-course brick run (60-90 min). Treat as a long aerobic run off the bike.'
      : 'Short-to-medium brick run. Focus on neuromuscular adaptation, not pace.';
    return {
      discipline: 'run',
      intent: 'brick_run',
      isOffBike: true,
      paceAdjustment: '10-20 sec/km slower than fresh-legs pace at equivalent RPE',
      mainSet: 'Run immediately off the bike. First 1 km conservative — allow neuromuscular adaptation. Target: aerobic effort (RPE 5-6/10).',
      targets: { rpe: '5-6/10', descriptor: 'off-bike aerobic run, pace naturally slower' },
      notes: `Expected pace 10-20 sec/km slower than standalone run at same RPE. Do not chase fresh-run splits. ${durationNote}`,
      phase,
    };
  }

  // -- Swim prescription ------------------------------------------------------

  private prescribeSwimSession(
    intent: SwimIntent,
    phase: PhaseLabel,
    distance: TriathlonDistance,
    calibration: TriCalibrationData,
    poolAccess: TriPoolAccess,
    baseDurationMin: number,
  ): Record<string, unknown> {
    const baseMeters = SWIM_BASE_METERS[distance][intent];
    // CSS → RPE fallback cascade: if CSS (Critical Swim Speed from 400m/200m test) is available,
    // use pace-based targets. Otherwise fall back to RPE descriptors.
    // Per methodology 'Swim calibration' — CSS is the preferred swim intensity anchor.
    const hasCSS = calibration.cssSecondsPer100m !== null;
    const css = calibration.cssSecondsPer100m;

    let warmUp: string;
    let mainSet: string;
    let coolDown: string;
    let totalMeters: number;
    let technique: string[];
    let notes: string | null = null;

    if (intent === 'technique') {
      // Per methodology 'Swim — technique sessions': always at Z1 (CSS+12s/100m or easy RPE).
      // Technique quality degrades rapidly above Z2 — no reason to go harder here.
      warmUp = '300m easy, focus on stroke length';
      coolDown = '200m easy';
      technique = ['catch', 'rotation', 'bilateral breathing', 'finger drag drill'];
      if (hasCSS && css) {
        const z1Pace = this.formatSwimPace(css + 12);
        mainSet = `8×50m drill/swim @ ${z1Pace} (Z1). Drill first 25m, swim second 25m.`;
        totalMeters = baseMeters;
      } else {
        mainSet = '8×50m drill/swim @ easy effort (RPE 4-5). Drill first 25m, smooth swim second 25m. Count strokes per length.';
        totalMeters = baseMeters;
      }
    } else if (intent === 'threshold') {
      warmUp = '400m easy, build last 100m';
      coolDown = '200m easy with pull buoy';
      technique = ['catch', 'high elbow'];
      if (hasCSS && css) {
        const cssPace = this.formatSwimPace(css);
        const z2Pace = this.formatSwimPace(css + 7);
        if (phase === 'base') {
          mainSet = `5×200m @ ${z2Pace} (Z2 aerobic), rest 30s. Focus on sustainable effort.`;
          totalMeters = 1000 + 400 + 200;
        } else if (phase === 'build' || phase === 'peak') {
          mainSet = `6×150m @ ${cssPace} (CSS/Z3), rest 20s. Consistent splits.`;
          totalMeters = 900 + 400 + 200;
        } else {
          mainSet = `4×100m @ ${cssPace} (CSS), rest 30s. Keep technique at threshold.`;
          totalMeters = 400 + 400 + 200;
        }
      } else {
        if (phase === 'base') {
          mainSet = '5×200m at moderate-hard effort (RPE 7-8, can speak 2-3 words), rest 30s.';
        } else if (phase === 'build' || phase === 'peak') {
          mainSet = '6×150m at threshold effort (RPE 8, can speak only 1 word), rest 20s.';
        } else {
          mainSet = '4×100m at threshold, rest 30s. Technique priority.';
        }
        totalMeters = baseMeters;
      }
    } else {
      // endurance
      warmUp = '300m easy';
      coolDown = '200m easy';
      technique = ['pacing', 'stroke consistency'];
      if (hasCSS && css) {
        const z2Pace = this.formatSwimPace(css + 8);
        const continuousMeters = Math.round(baseMeters * 0.65);
        mainSet = `${continuousMeters}m continuous @ ${z2Pace} (Z2). Negative split: second half faster than first.`;
        totalMeters = baseMeters;
      } else {
        const continuousMeters = Math.round(baseMeters * 0.65);
        mainSet = `${continuousMeters}m continuous at conversational aerobic effort (RPE 5-6). Negative split.`;
        totalMeters = baseMeters;
        notes = 'Without CSS data, use a pace that lets you breathe comfortably every 2 strokes.';
      }
    }

    const prescription: Record<string, unknown> = {
      discipline: 'swim',
      intent,
      warmUp,
      mainSet,
      coolDown,
      totalMeters,
      technique,
    };

    if (notes) prescription['notes'] = notes;
    if (hasCSS && css) prescription['cssAnchorPace'] = this.formatSwimPace(css);

    return this.adaptSwimToPool(prescription, poolAccess);
  }

  // -- Pool access adaptation ------------------------------------------------

  private adaptSwimToPool(prescription: Record<string, unknown>, poolAccess: TriPoolAccess): Record<string, unknown> {
    switch (poolAccess) {
      case '25m':
        // Shorter pool: technique work easier, more turns = more rest per lap
        return {
          ...prescription,
          poolLength: '25m',
          poolNote: '25m pool: turns add brief rest — adjust interval pacing slightly harder.',
        };

      case '50m':
        // Longer pool: fewer turns, requires more sustained effort, better for endurance sets
        return {
          ...prescription,
          poolLength: '50m',
          poolNote: '50m pool: no turn advantage — pace is more representative of open water. Good for endurance sets.',
        };

      case 'pool_and_open_water':
        return {
          ...prescription,
          poolLength: 'pool or open water',
          poolNote: 'Use pool for technique and threshold sets. Use open water for endurance sets — include sighting drills every 6-10 strokes.',
          sightingDrills: prescription['intent'] === 'endurance',
        };

      case 'open_water': {
        // Per methodology 'Pool access — open water only': convert all distance targets to time.
        // Pace is meaningless without marked distance; sighting drills are mandatory for race prep.
        // Judgment call: using 2min/100m as rough conversion — this is recreational baseline.
        // Faster swimmers will have shorter sessions than intended; noted as known limitation.
        const meters = prescription['totalMeters'] as number;
        const estimatedMinutes = Math.round(meters / 50); // rough 2 min/100m for recreational
        return {
          ...prescription,
          poolLength: 'open water',
          totalMinutes: estimatedMinutes,
          totalMeters: null,
          mainSet: `${prescription['mainSet']} [Adapt to time-based: replace distance targets with effort/time. Include sighting every 6-10 strokes.]`,
          sightingDrills: true,
          poolNote: 'Open water only: convert distances to approximate times. Sight a landmark every 6-10 strokes.',
        };
      }

      case 'none':
        // Per methodology 'Swim' — "preserve swim frequency first", but when pool access is 'none'
        // there is no viable swim. Judgment call: return a WARNING prescription rather than
        // removing the session from the template. The session stays in the plan so the scheduler
        // can place it; the user sees the substitute options (dryland strength) when viewing the session.
        // Alternative considered: remove swim sessions entirely when poolAccess='none'.
        // Rejected: losing swim context makes it harder to reintroduce swims if pool access changes.
        return {
          discipline: 'swim',
          intent: prescription['intent'],
          WARNING: 'No pool access configured. This swim session cannot be performed as prescribed. Substitute: dryland swim-specific strength (lat pulldowns, single-arm cable rows, face pulls) or cross-train on bike/run.',
          poolLength: null,
        };

      default:
        return prescription;
    }
  }

  // -- Bike prescription ------------------------------------------------------

  private prescribeBikeSession(
    intent: BikeIntent,
    phase: PhaseLabel,
    distance: TriathlonDistance,
    calibration: TriCalibrationData,
  ): Record<string, unknown> {
    // FTP → LTHR → RPE fallback cascade:
    // 1. FTP (with power meter) is the gold standard — watt targets are direct and phase-precise.
    // 2. LTHR (heart rate at lactate threshold) is the first fallback — HR zones drift with fatigue
    //    but are still far better than pure RPE for structured intervals.
    // 3. RPE only — least precise but sufficient for recreational athletes and those new to structured training.
    // Per methodology 'Bike calibration' — all three tiers are legitimate; don't force FTP.
    const { ftpWatts, lthrBpm, hasPowerMeter } = calibration;
    const hasFTP = ftpWatts !== null && hasPowerMeter;
    const hasHR = lthrBpm !== null;

    if (intent === 'intervals') {
      // Sweet-spot (Z3 high) or VO2max depending on phase
      // Per methodology 'Bike — intervals': sprint/olympic use VO2max intervals in build+peak
      // (race duration is short, VO2max ceiling is the limiter). 70.3/140.6 stay at sweet-spot
      // even in build — aerobic threshold is the primary limiter at longer distances.
      const isVO2 = phase === 'peak' || (phase === 'build' && (distance === 'sprint' || distance === 'olympic'));

      if (hasFTP && ftpWatts) {
        const ssLow = Math.round(ftpWatts * 0.84);
        const ssHigh = Math.round(ftpWatts * 0.90);
        const vo2Low = Math.round(ftpWatts * 1.06);
        const vo2High = Math.round(ftpWatts * 1.15);
        const intervals = isVO2
          ? `5×4min @ ${vo2Low}-${vo2High}W (106-115% FTP), 4min recovery`
          : `3×15min @ ${ssLow}-${ssHigh}W (84-90% FTP), 5min recovery`;

        return {
          discipline: 'bike',
          intent: isVO2 ? 'vo2max' : 'sweet_spot',
          warmUp: '15min easy spin',
          intervals,
          targets: { watts: isVO2 ? `${vo2Low}-${vo2High}W` : `${ssLow}-${ssHigh}W`, rpe: isVO2 ? '9/10' : '7/10' },
          coolDown: '10min easy',
          notes: 'Hold target power throughout each interval. Power fade >5% → stop interval.',
        };
      }

      if (hasHR && lthrBpm) {
        const z3Low = Math.round(lthrBpm * 0.84);
        const z3High = Math.round(lthrBpm * 0.90);
        const intervals = isVO2
          ? `5×4min @ ${Math.round(lthrBpm * 1.02)}-${Math.round(lthrBpm * 1.06)} bpm, 4min recovery`
          : `3×15min @ ${z3Low}-${z3High} bpm (Z3/sweet-spot HR), 5min recovery`;

        return {
          discipline: 'bike',
          intent: isVO2 ? 'vo2max' : 'sweet_spot',
          warmUp: '15min easy spin',
          intervals,
          targets: { hrBpm: isVO2 ? `>${lthrBpm}bpm` : `${z3Low}-${z3High}bpm`, rpe: isVO2 ? '9/10' : '7/10' },
          coolDown: '10min easy',
          calibrationPrompt: 'Add FTP for precise watt targets: Settings → Triathlon Calibration.',
        };
      }

      // RPE only
      return {
        discipline: 'bike',
        intent: isVO2 ? 'vo2max' : 'sweet_spot',
        warmUp: '15min easy spin',
        intervals: isVO2
          ? '5×4min at very hard effort (RPE 9/10, barely sustainable), 4min easy recovery'
          : '3×15min at "comfortably hard" effort (RPE 7/10, can speak in short phrases), 5min easy recovery',
        targets: { rpe: isVO2 ? '9/10' : '7/10', descriptor: isVO2 ? 'barely sustainable' : 'comfortably hard, short phrases' },
        coolDown: '10min easy',
        calibrationPrompt: 'Add FTP (Settings → Triathlon Calibration) for precise power targets.',
      };
    }

    if (intent === 'long' || intent === 'race_pace') {
      // Long aerobic ride — Z2 with race-pace surges in build/peak
      const raceSegments = (phase === 'build' || phase === 'peak') && distance !== 'sprint';

      if (hasFTP && ftpWatts) {
        const z2Low = Math.round(ftpWatts * 0.56);
        const z2High = Math.round(ftpWatts * 0.75);
        const racePaceWatts = Math.round(ftpWatts * (distance === 'sprint' ? 0.88 : distance === 'olympic' ? 0.82 : 0.78));

        return {
          discipline: 'bike',
          intent: 'endurance',
          format: 'long_ride',
          targets: { watts: `${z2Low}-${z2High}W (Z2)`, rpe: '6/10' },
          raceSegments: raceSegments ? `Include 2×20min @ ~${racePaceWatts}W (race-pace effort) mid-ride` : null,
          notes: 'Ride at conversational pace throughout. Fuel every 30-40min with carbohydrate.',
          // Per methodology 'Long bike' — 70.3 long ride caps at 5h, 140.6 at 6h.
          // Beyond 6h, methodology recommends back-to-back moderate days over single ultra-long ride
          // (lower injury risk, similar adaptation stimulus).
          longRideCap: distance === '70_3' ? '5h max per methodology' : distance === '140_6' ? '6h max — substitute back-to-back race-rehearsal days beyond this' : null,
        };
      }

      return {
        discipline: 'bike',
        intent: 'endurance',
        format: 'long_ride',
        targets: { rpe: '6/10', descriptor: 'conversational pace, could hold a full conversation' },
        raceSegments: raceSegments ? 'Include 2×20min at race-effort (RPE 8/10) mid-ride' : null,
        notes: 'Stay aerobic. Fuel every 30-40min. Focus on nutrition practice for longer distances.',
        longRideCap: distance === '140_6' ? '6h max per methodology' : null,
        calibrationPrompt: 'Add FTP (Settings → Triathlon Calibration) for power targets.',
      };
    }

    // sweet_spot fallback
    return {
      discipline: 'bike',
      intent: 'sweet_spot',
      targets: { rpe: '7/10' },
      notes: 'Comfortably hard aerobic effort.',
    };
  }

  // -- Run prescription -------------------------------------------------------

  private prescribeRunSession(
    intent: RunIntent,
    phase: PhaseLabel,
    distance: TriathlonDistance,
  ): Record<string, unknown> {
    if (intent === 'quality') {
      const isIntervals = phase === 'build' || phase === 'peak';
      const isShortDistance = distance === 'sprint' || distance === 'olympic';

      // Per methodology 'Run — quality sessions': short-course (sprint/olympic) quality = VO2max
      // intervals. Long-course quality = LT2 tempo. Judgment call: this split is on distance,
      // not on phase — a sprint athlete in base phase still benefits more from aerobic tempo
      // than VO2max, but the template uses the simpler distance-based gate here.
      if (isIntervals && isShortDistance) {
        return {
          discipline: 'run',
          intent: 'vo2max',
          warmUp: '15min easy jog + strides',
          mainSet: '5×1000m at 5K-ish effort (RPE 9/10), 2min jog recovery',
          coolDown: '10min easy jog',
          targets: { rpe: '9/10', descriptor: 'can only say 2-3 words, race-pace effort' },
          notes: 'First 2 reps feel comfortable — that is correct. Don\'t blow up early.',
        };
      }

      if (isIntervals) {
        // 70.3/140.6 quality = LT2 tempo, not VO2max
        // Per methodology 'Run — triathlon-specific note': run pace targets are always set from
        // fresh-leg testing but the athlete must understand race-day run performance will be lower.
        // The threshold sessions train the physiological ceiling; race pacing is a separate skill.
        return {
          discipline: 'run',
          intent: 'threshold',
          warmUp: '10min easy jog',
          mainSet: '25min continuous at LT2 effort (RPE 8/10, can speak 1 word), or 3×8min with 2min recovery',
          coolDown: '10min easy jog',
          targets: { rpe: '8/10', descriptor: 'half-marathon pace effort' },
          notes: 'In triathlon, run zones are prescribed off fresh-leg pace but executed at race-day on tired legs.',
        };
      }

      // Base phase quality = tempo
      return {
        discipline: 'run',
        intent: 'tempo',
        warmUp: '10min easy jog',
        mainSet: '20min at tempo effort (RPE 7-8/10, can speak in short phrases)',
        coolDown: '10min easy jog',
        targets: { rpe: '7-8/10', descriptor: 'comfortably hard, sustainable for 40-50 min' },
      };
    }

    if (intent === 'easy') {
      return {
        discipline: 'run',
        intent: 'easy',
        mainSet: 'Easy aerobic run at conversational pace (RPE 4-5/10). Include 4-6×20s strides near end.',
        targets: { rpe: '4-5/10', descriptor: 'could carry a full conversation, nose-breathing possible' },
        notes: 'Strides: accelerate over 20s to 95% effort, float 10s, walk 30s recovery.',
      };
    }

    // long run
    // Per methodology 'Run — long run caps': distance-gated to prevent over-running relative to
    // overall tri training stress. Sprint athletes don't need 25km long runs.
    // Race-pace finish (final 15-20%) is a build/peak progression stimulus — base phase stays
    // fully aerobic to build the foundation before adding specificity.
    const includeRacePaceFinish = (phase === 'build' || phase === 'peak') && distance !== 'sprint';
    const cap = { sprint: 14, olympic: 18, '70_3': 25, '140_6': 32 }[distance];

    return {
      discipline: 'run',
      intent: 'long_run',
      mainSet: includeRacePaceFinish
        ? `Long aerobic run (RPE 5-6/10). Final 15-20% at race pace effort (RPE 8/10). Distance cap: ${cap}km.`
        : `Long aerobic run at conversational pace (RPE 5-6/10). Distance cap: ${cap}km.`,
      targets: { rpe: '5-6/10', descriptor: 'conversational pace, aerobic base building' },
      longRunCap: `${cap}km (per methodology)`,
      notes: distance === '140_6'
        ? 'Cap run volume below stand-alone marathon capacity — overall training stress is already high.'
        : 'Include strides in final 10-15 min for neuromuscular stimulus.',
    };
  }

  // -- Strength prescription --------------------------------------------------

  private prescribeStrengthSession(distance: TriathlonDistance): Record<string, unknown> {
    // Per methodology 'Strength training': posterior chain + pulling patterns are the triathlon
    // additions vs a run-only plan. Pulling is swim-specific. Single-leg work targets run economy.
    // Plyometrics are included at reduced volume vs running plans — overall load is already high.
    // Strength prescription does not vary by distance (Tier/week-count controls frequency instead).
    return {
      discipline: 'strength',
      focus: [
        'Heavy compound lower body: deadlifts, hip thrusts, Bulgarian split squats',
        'Pulling patterns (swim-specific): pull-ups or lat pulldowns, single-arm rows, face pulls',
        'Core anti-rotation: Pallof press, dead bugs',
        'Single-leg work: step-ups, single-leg Romanian deadlift',
        'Plyometrics (run economy): box jumps, single-leg hops — reduced volume vs running plan due to higher overall load',
      ],
      sets: '3-4 sets per exercise, heavy (4-6 rep range for compound, 8-12 for accessory)',
      notes: 'Never zero strength. Posterior chain + pulling patterns are the triathlon-specific additions vs run plan.',
      avoidance: 'Avoid high-rep triathlon circuits — minimal economy benefit, high recovery cost.',
    };
  }

  // -- Utilities --------------------------------------------------------------

  private triSession(
    sessionType: string,
    purpose: string,
    priority: PlannedSessionPriority,
    baseDuration: number,
    intensity: PlannedSessionIntensity,
    discipline: PlannedSessionDiscipline,
    distanceTargetKm: number | null,
    substituteOptions: string[],
    swimIntent?: SwimIntent,
    bikeIntent?: BikeIntent,
    runIntent?: RunIntent,
  ): TriTemplateSession {
    return {
      sessionType, purpose, priority, baseDuration, intensity, discipline,
      distanceTargetKm, substituteOptions, swimIntent, bikeIntent, runIntent,
    };
  }

  private formatSwimPace(secondsPer100m: number): string {
    const safe = Math.max(60, Math.round(secondsPer100m));
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;
    return `${mins}:${String(secs).padStart(2, '0')}/100m`;
  }

  private resolveTotalWeeks(plan: TrainingPlan): number {
    return plan.totalWeeks || PLAN_LENGTH_DEFAULT[plan.triathlonDistance ?? 'olympic'];
  }

  private resolvePlanStartDate(plan: TrainingPlan, totalWeeks: number): Date {
    // Race mode: count backwards from goal date so taper week always ends on race week.
    // General fitness mode: start from current week (Monday of current week).
    if (plan.goalDate && plan.mode === 'race') {
      const goal = this.parseDate(plan.goalDate);
      if (goal) {
        return this.startOfWeek(this.addDays(goal, -((totalWeeks - 1) * 7)));
      }
    }
    return this.startOfWeek(new Date());
  }

  private startOfWeek(date: Date): Date {
    const copy = new Date(date);
    const diff = (copy.getDay() + 6) % 7;
    copy.setDate(copy.getDate() - diff);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  private addDays(date: Date, days: number): Date {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  private toDateString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private parseDate(value: string): Date | null {
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
}
