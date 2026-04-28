import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RaceDayPlan } from './race-day-plan.entity';
import { CreateRaceDayPlanDto, UpdateRaceDayPlanDto } from './race-day-plan.dto';
import { SchedulerSettings } from '../scheduler-settings/scheduler-settings.entity';
import { TrainingPlan, TriathlonDistance } from '../training-plan/training-plan.entity';
import { TriathlonPlanTemplateService, TriExperienceLevel } from '../domain/triathlon-plan-template.service';

// ---------------------------------------------------------------------------
// CRUD methods (Part 1C)
// ---------------------------------------------------------------------------

@Injectable()
export class RaceDayPlanService {
  constructor(
    @InjectRepository(RaceDayPlan)
    private readonly repo: Repository<RaceDayPlan>,
  ) {}

  async create(userId: string, dto: CreateRaceDayPlanDto): Promise<RaceDayPlan> {
    const existing = await this.repo.findOne({ where: { userId, planId: dto.planId } });
    if (existing) {
      throw new ConflictException(
        'A race-day plan already exists for this training plan. Use PUT to update.',
      );
    }
    const plan = this.repo.create({ ...dto, userId });
    return this.repo.save(plan);
  }

  async findAll(userId: string): Promise<RaceDayPlan[]> {
    return this.repo.find({ where: { userId } });
  }

  async findByPlan(userId: string, planId: string): Promise<RaceDayPlan | null> {
    return this.repo.findOne({ where: { userId, planId } });
  }

  async update(id: string, userId: string, dto: UpdateRaceDayPlanDto): Promise<RaceDayPlan> {
    const plan = await this.repo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Race-day plan not found');
    if (plan.userId !== userId) throw new ForbiddenException();
    Object.assign(plan, dto);
    return this.repo.save(plan);
  }

  async remove(id: string, userId: string): Promise<void> {
    const plan = await this.repo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Race-day plan not found');
    if (plan.userId !== userId) throw new ForbiddenException();
    await this.repo.remove(plan);
  }

  // ---------------------------------------------------------------------------
  // Generator (Part 2C)
  // ---------------------------------------------------------------------------

  async generateRaceDayPlan(
    userId: string,
    plan: TrainingPlan,
    settings: SchedulerSettings,
  ): Promise<{ plan: RaceDayPlan; alreadyExisted: boolean }> {
    if (plan.sportType !== 'triathlon' || !plan.triathlonDistance) {
      throw new BadRequestException(
        'Race-day plan generation requires a triathlon plan with a distance set.',
      );
    }

    const distance = plan.triathlonDistance;
    const experienceLevel = TriathlonPlanTemplateService.computeExperienceLevel(
      settings.triathlonsCompleted,
      settings.endurancePedigree,
    );
    const buffer = PACE_BUFFER[experienceLevel];

    const calibration = {
      ftpWatts: settings.ftpWatts,
      lthrBpm: settings.lthrBpm,
      cssSecondsPer100m: settings.cssSecondsPer100m,
      hasPowerMeter: settings.hasPowerMeter,
    };

    const pacingPlan = this.buildPacingPlan(distance, calibration, experienceLevel, buffer);
    const fuelingPlan = this.buildFuelingPlan(distance, pacingPlan.estimatedRaceMinutes);
    const hydrationPlan = this.buildHydrationPlan(distance);
    const transitionPlan = this.buildTransitionPlan(distance);
    const contingencyPlan = this.buildContingencyPlan(distance, experienceLevel);

    // Strip internal field before persisting
    const { estimatedRaceMinutes, ...pacingPlanClean } = pacingPlan;

    const dto: UpdateRaceDayPlanDto = {
      raceDate: plan.goalDate ?? new Date().toISOString().slice(0, 10),
      pacingPlan: pacingPlanClean,
      fuelingPlan,
      hydrationPlan,
      transitionPlan,
      contingencyPlan,
    };

    const existing = await this.findByPlan(userId, plan.id);
    if (existing) {
      const updated = await this.update(existing.id, userId, dto);
      return { plan: updated, alreadyExisted: true };
    }

    const created = await this.create(userId, {
      planId: plan.id,
      raceDate: dto.raceDate!,
      ...dto,
    });
    return { plan: created, alreadyExisted: false };
  }

  // ---------------------------------------------------------------------------
  // Pacing helpers
  // ---------------------------------------------------------------------------

  private buildPacingPlan(
    distance: TriathlonDistance,
    calibration: { ftpWatts: number | null; lthrBpm: number | null; cssSecondsPer100m: number | null; hasPowerMeter: boolean },
    experienceLevel: TriExperienceLevel,
    buffer: number,
  ): Record<string, any> & { estimatedRaceMinutes: number } {
    const swim = this.swimTarget(distance, calibration.cssSecondsPer100m, buffer);
    const bike = this.bikeTarget(distance, calibration.ftpWatts, calibration.lthrBpm, calibration.hasPowerMeter, buffer);
    const run = this.runTarget(distance, null, buffer); // runThreshold not yet a stored field — RPE fallback

    // Estimate race duration in minutes for sprint fueling decision
    const swimDistanceM = SWIM_DIST_M[distance];
    const bikeDistanceKm = BIKE_DIST_KM[distance];
    const runDistanceKm = RUN_DIST_KM[distance];

    const swimMinutes = swim.secPer100m !== null
      ? (swimDistanceM / 100) * (swim.secPer100m / 60)
      : FALLBACK_SWIM_MIN[distance];
    const bikeMinutes = bike.targetFtpFraction !== null
      ? bikeDistanceKm / APPROX_BIKE_SPEED_KMH[distance]
      : FALLBACK_BIKE_MIN[distance];
    const runMinutes = run.secPerKm !== null
      ? (runDistanceKm * run.secPerKm) / 60
      : FALLBACK_RUN_MIN[distance];

    const transitionMinutes = distance === 'sprint' || distance === 'olympic' ? 5 : 8;
    const estimatedRaceMinutes = Math.round(swimMinutes + bikeMinutes + runMinutes + transitionMinutes);

    return {
      swim: swim.output,
      bike: bike.output,
      run: run.output,
      estimatedRaceMinutes,
      experienceLevel,
      paceBuffer: `${Math.round(buffer * 100)}% conservative buffer applied`,
      note: PACING_NOTES[experienceLevel],
    };
  }

  private swimTarget(
    distance: TriathlonDistance,
    cssSecPer100m: number | null,
    buffer: number,
  ): { secPer100m: number | null; output: Record<string, any> } {
    if (cssSecPer100m === null) {
      return {
        secPer100m: null,
        output: {
          target: 'RPE 6–7 / 10 — steady, controlled effort; you should be able to sight every 8–10 strokes',
          basis: 'RPE only — no CSS on file',
        },
      };
    }
    // Apply buffer: swim at CSS + buffer seconds/100m (slower = higher seconds)
    const targetSec = cssSecPer100m * (1 + buffer);
    return {
      secPer100m: targetSec,
      output: {
        target: `${secsToMmSs(targetSec)}/100m`,
        basis: `CSS (${secsToMmSs(cssSecPer100m)}/100m) + ${Math.round(buffer * 100)}% buffer`,
        rpe: '6–7/10',
      },
    };
  }

  private bikeTarget(
    distance: TriathlonDistance,
    ftpWatts: number | null,
    lthrBpm: number | null,
    hasPowerMeter: boolean,
    buffer: number,
  ): { targetFtpFraction: number | null; output: Record<string, any> } {
    // Per methodology: race-pace fraction of FTP by distance (80% for olympic/70.3, 75% for 140.6, 85% for sprint)
    const raceFtpFraction = RACE_BIKE_FTP_FRACTION[distance];
    const bufferedFraction = raceFtpFraction * (1 - buffer);

    if (ftpWatts !== null && hasPowerMeter) {
      const targetWatts = Math.round(ftpWatts * bufferedFraction);
      return {
        targetFtpFraction: bufferedFraction,
        output: {
          target: `${targetWatts}W (${Math.round(bufferedFraction * 100)}% FTP)`,
          basis: `FTP (${ftpWatts}W) × ${Math.round(raceFtpFraction * 100)}% race pace × ${Math.round((1 - buffer) * 100)}% buffer`,
          rpe: '6–7/10',
        },
      };
    }

    if (lthrBpm !== null) {
      // Approximate HR zone: race fraction maps to ~75–85% LTHR range
      const targetHrFraction = 0.78 + (raceFtpFraction - 0.75) * 0.4;
      const bufferedHrFraction = targetHrFraction * (1 - buffer * 0.5); // HR buffer is softer than power
      const targetBpm = Math.round(lthrBpm * bufferedHrFraction);
      return {
        targetFtpFraction: null,
        output: {
          target: `${targetBpm} bpm (${Math.round(bufferedHrFraction * 100)}% LTHR)`,
          basis: `LTHR (${lthrBpm} bpm) — no power meter; HR-based target`,
          rpe: '6–7/10',
        },
      };
    }

    return {
      targetFtpFraction: null,
      output: {
        target: `RPE 6–7 / 10 — conversational-minus; you should be able to speak in short sentences`,
        basis: 'RPE only — no FTP or LTHR on file',
      },
    };
  }

  private runTarget(
    distance: TriathlonDistance,
    runThresholdSecPerKm: number | null,
    buffer: number,
  ): { secPerKm: number | null; output: Record<string, any> } {
    if (runThresholdSecPerKm !== null) {
      // Off-bike adjustment: methodology says 10–20 s/km slower at same RPE; use 15 s/km midpoint
      const offBikeAdjustSec = 15;
      const bufferedSec = runThresholdSecPerKm * (1 + buffer) + offBikeAdjustSec;
      return {
        secPerKm: bufferedSec,
        output: {
          target: `${secsToMmSs(bufferedSec)}/km`,
          basis: `Run threshold (${secsToMmSs(runThresholdSecPerKm)}/km) + ${Math.round(buffer * 100)}% buffer + 15 s/km off-bike adjustment`,
          rpe: '7/10',
        },
      };
    }

    // RPE-anchored descriptions that vary by distance
    const rpeDesc: Record<TriathlonDistance, string> = {
      sprint: 'RPE 7–8/10 — hard but sustainable; 5 km race pace',
      olympic: 'RPE 7/10 — comfortably hard; 10 km race pace',
      '70_3': 'RPE 6–7/10 — half-marathon effort; you should feel in control',
      '140_6': 'RPE 5–6/10 — easy conversation pace; disciplined restraint is the goal',
    };
    return {
      secPerKm: null,
      output: {
        target: rpeDesc[distance],
        basis: 'RPE only — no run threshold on file',
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Fueling helpers
  // ---------------------------------------------------------------------------

  private buildFuelingPlan(
    distance: TriathlonDistance,
    estimatedRaceMinutes: number,
  ): Record<string, any> {
    if (distance === 'sprint') {
      return this.sprintFuelingPlan(estimatedRaceMinutes);
    }

    const specs = FUELING_SPECS[distance];
    return {
      carbsPerHourMin: specs.carbsMin,
      carbsPerHourMax: specs.carbsMax,
      onBike: specs.onBike,
      onRun: specs.onRun,
      preRace: PRE_RACE_NUTRITION,
      note: `Target ${specs.carbsMin}–${specs.carbsMax} g/h carbohydrates. Practise your exact race-day nutrition in the final long brick session.`,
    };
  }

  private sprintFuelingPlan(estimatedRaceMinutes: number): Record<string, any> {
    // Per clarification: conditional on estimated race duration
    let gelsRecommendation: string;
    if (estimatedRaceMinutes < 60) {
      gelsRecommendation = 'Skip mid-race gels — race is under 60 min. Focus on pre-race carbohydrate loading (pasta/rice night before, 50–75 g carbs 2 h before start).';
    } else if (estimatedRaceMinutes <= 75) {
      gelsRecommendation = `Optional: one gel at T1 if you tolerate them well during training. Your estimated race time (${estimatedRaceMinutes} min) is borderline — practise this in training to confirm.`;
    } else {
      gelsRecommendation = `Recommended: one gel at T1 and one at km 3 of the run. Your estimated race time (${estimatedRaceMinutes} min) warrants fuelling support.`;
    }

    return {
      estimatedRaceMinutes,
      carbsPerHour: '40–60 g/h (race duration dependent)',
      gels: gelsRecommendation,
      preRace: PRE_RACE_NUTRITION,
      note: 'Sprint fuelling is primarily pre-race. Mid-race nutrition matters more as race duration approaches 75+ min.',
    };
  }

  // ---------------------------------------------------------------------------
  // Hydration helpers
  // ---------------------------------------------------------------------------

  private buildHydrationPlan(distance: TriathlonDistance): Record<string, any> {
    const raceHours = Math.round((FALLBACK_SWIM_MIN[distance] + FALLBACK_BIKE_MIN[distance] + FALLBACK_RUN_MIN[distance]) / 60 * 10) / 10;

    return {
      baselineMlPerHour: 600,
      conditions: {
        hot: {
          threshold: '>25°C',
          mlPerHour: 750,
          electrolytes: 'Start electrolytes from lap 1 / km 1 of bike',
          note: 'Drink to thirst above baseline; do not force fluids beyond 750 ml/h',
        },
        neutral: {
          threshold: '15–25°C',
          mlPerHour: 600,
          electrolytes: 'Electrolytes after 90 min of racing',
          note: 'Standard conditions; stick to plan',
        },
        cool: {
          threshold: '<15°C',
          mlPerHour: 500,
          electrolytes: 'Electrolytes after 90 min; cold suppresses thirst — drink on schedule regardless',
          note: 'Do not skip fluids because you do not feel thirsty — cool weather masks dehydration',
        },
      },
      preRace: '500 ml water 2 h before start; 200 ml 30 min before',
      estimatedTotalFluidL: Math.round(raceHours * 0.6 * 10) / 10,
      note: 'Check race-day forecast the evening before and select the matching condition tier above.',
    };
  }

  // ---------------------------------------------------------------------------
  // Transition helpers
  // ---------------------------------------------------------------------------

  private buildTransitionPlan(distance: TriathlonDistance): Record<string, any> {
    const isLongCourse = distance === '70_3' || distance === '140_6';

    const t1Steps = [
      'Exit water; begin wetsuit removal at shoulders while running to transition',
      'Sit — strip wetsuit fully, goggles off, swim cap off',
      'Helmet ON before touching your bike (penalty if reversed)',
      'Sunglasses on (optional — clip to helmet if fumbling)',
      ...(isLongCourse ? ['Pick up nutrition bag if pre-staged'] : []),
      'Bike shoes: clip-on shoes stay on pedals; walk to mount line in socks',
      'Cross mount line — clip in once moving',
      ...(isLongCourse ? ['First 5 min on bike: settle breathing before starting nutrition'] : []),
    ];

    const t2Steps = [
      'Approach dismount line — unclip shoes before line if clip-on style',
      'Cross dismount line — do NOT ride through it (time penalty)',
      'Run bike to rack; rack by saddle or nose (per race rules)',
      'Helmet OFF after bike is racked',
      'Running shoes on; elastic laces — no double-knot under pressure',
      ...(isLongCourse ? [
        'Apply sunscreen if long-course (aid stations may have sunscreen)',
        'Pick up run nutrition if pre-staged',
        'Mental reset: "You are now a runner." First km will feel strange — that is normal.',
      ] : []),
      'Exit transition — do not sprint the first 500 m; let legs adapt',
    ];

    return {
      t1: {
        targetSeconds: isLongCourse ? 180 : 90,
        steps: t1Steps,
        tip: 'Practise T1 at least twice in the final 4 weeks. Wetsuit removal is a learnable skill.',
      },
      t2: {
        targetSeconds: isLongCourse ? 120 : 60,
        steps: t2Steps,
        tip: 'T2 is faster than T1 but legs will feel wooden. Trust the first 400 m.',
      },
      raceWeekSetup: [
        'Rack with both transitions already set up the day before if allowed',
        'Mark your transition spot with a bright-coloured towel (check race rules first)',
        'Walk T1→bike rack→T2 exit route once before race morning',
      ],
    };
  }

  // ---------------------------------------------------------------------------
  // Contingency helpers
  // ---------------------------------------------------------------------------

  private buildContingencyPlan(
    distance: TriathlonDistance,
    experienceLevel: TriExperienceLevel,
  ): Record<string, any> {
    const isLongCourse = distance === '70_3' || distance === '140_6';

    return {
      cramp: {
        trigger: 'Sustained muscle cramp lasting more than 30 seconds during bike or run',
        action: [
          'Reduce intensity to RPE 4–5 for 2–3 min',
          'Increase electrolyte intake if available (salt tablet, electrolyte drink)',
          'Stretch briefly at next opportunity (bike: pedal one-legged; run: slow to walk)',
          'If cramp resolves, return to RPE 6–7; do not chase lost time',
        ],
      },
      mechanical: {
        trigger: 'Flat tyre, dropped chain, or equipment failure on bike',
        action: [
          'Move to roadside immediately; signal marshals if available',
          'Use your repair kit (CO2/pump + tube) — practise this before race day',
          ...(isLongCourse ? [
            'If repair exceeds 10 min, reassess — DNF is not failure on long course',
          ] : []),
          'Marshals and neutral support may be available — raise your hand',
        ],
      },
      missedNutrition: {
        trigger: 'Missed a planned gel or bottle on the bike',
        action: [
          'Do not double up immediately — doubled carbs cause GI distress',
          'Resume normal schedule from the next planned intake',
          'If two or more intakes missed: reduce run intensity by half a RPE point',
          ...(isLongCourse ? [
            'On long course: a 20 g/h deficit over 30 min is recoverable; over 60 min, bonk risk is real — take extra at next aid station',
          ] : []),
        ],
      },
      goingTooHard: {
        trigger: 'Heart rate or perceived effort exceeds target by 15%+ for more than 5 min',
        action: [
          experienceLevel === 'true_beginner' || experienceLevel === 'tri_novice_but_fit'
            ? 'Back off immediately — first-race goal is finish, not time. The run pays for the bike.'
            : 'Ease back to target zone; accept the time cost — finishing well beats a late blow-up.',
          'If on swim: bilateral breathing, reduce stroke rate, find feet to draft',
          'If on bike: drop a gear, reduce watts/HR target by 10%, recover for 5 min before re-assessing',
          'If on run: walk 60 seconds at next aid station, resume at conservative pace',
        ],
      },
      ...(isLongCourse ? {
        gi: {
          trigger: 'Nausea, vomiting, or GI distress on run',
          action: [
            'Stop carbohydrate intake for 20 min; water only',
            'Reduce pace to RPE 4–5',
            'Cola at aid stations is an underrated rescue — fructose + caffeine + fizz helps many athletes',
            'Walk until stomach settles; running through nausea rarely improves it',
          ],
        },
      } : {}),
    };
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Per plan decision: tiered buffer by experience level
const PACE_BUFFER: Record<TriExperienceLevel, number> = {
  true_beginner: 0.15,
  tri_novice_but_fit: 0.12,
  intermediate: 0.08,
  experienced: 0.00,
};

// Per methodology 'Race-distance training emphasis' — FTP fraction at race pace
const RACE_BIKE_FTP_FRACTION: Record<TriathlonDistance, number> = {
  sprint: 0.85,
  olympic: 0.80,
  '70_3': 0.80,
  '140_6': 0.75,
};

// Race discipline distances
const SWIM_DIST_M: Record<TriathlonDistance, number> = {
  sprint: 750, olympic: 1500, '70_3': 1900, '140_6': 3800,
};
const BIKE_DIST_KM: Record<TriathlonDistance, number> = {
  sprint: 20, olympic: 40, '70_3': 90, '140_6': 180,
};
const RUN_DIST_KM: Record<TriathlonDistance, number> = {
  sprint: 5, olympic: 10, '70_3': 21.1, '140_6': 42.2,
};

// Approximate bike speed at race pace for duration estimation (km/h)
const APPROX_BIKE_SPEED_KMH: Record<TriathlonDistance, number> = {
  sprint: 30, olympic: 30, '70_3': 28, '140_6': 26,
};

// Fallback race-segment durations (minutes) when calibration is missing
const FALLBACK_SWIM_MIN: Record<TriathlonDistance, number> = {
  sprint: 18, olympic: 35, '70_3': 45, '140_6': 80,
};
const FALLBACK_BIKE_MIN: Record<TriathlonDistance, number> = {
  sprint: 40, olympic: 80, '70_3': 193, '140_6': 415,
};
const FALLBACK_RUN_MIN: Record<TriathlonDistance, number> = {
  sprint: 28, olympic: 60, '70_3': 130, '140_6': 285,
};

// Per methodology fueling table
const FUELING_SPECS: Record<TriathlonDistance, { carbsMin: number; carbsMax: number; onBike: string; onRun: string }> = {
  sprint: {
    carbsMin: 40, carbsMax: 60,
    onBike: 'Optional — see gels field for duration-based recommendation',
    onRun: 'Water only unless race exceeds 75 min',
  },
  olympic: {
    carbsMin: 60, carbsMax: 60,
    onBike: 'One gel or 500 ml sports drink (30–40 g carbs) at km 15; sip water at aid stations',
    onRun: 'One gel at km 5; water at every aid station',
  },
  '70_3': {
    carbsMin: 80, carbsMax: 100,
    onBike: 'Gel or bar every 20–25 min (aim for 40–50 g carbs/h on bike); water with each intake',
    onRun: 'Gel every 25–30 min; cola optional at aid stations from km 12 onward',
  },
  '140_6': {
    carbsMin: 90, carbsMax: 120,
    onBike: 'Gel or bar every 15–20 min; 200 ml water with each; mix carb sources for gut variety',
    onRun: 'Gel every 20 min; cola + water at aid stations; switch to solids if available from km 20',
  },
};

const PRE_RACE_NUTRITION = {
  nightBefore: '70–100 g carbohydrates with dinner; familiar food only',
  raceMorning: '50–75 g carbohydrates 2–2.5 h before start; white toast, banana, or rice cakes',
  final30Min: '200 ml water; avoid new foods',
};

const PACING_NOTES: Record<TriExperienceLevel, string> = {
  true_beginner: 'First race — your only goal is to finish feeling in control. Start 20% easier than all targets for the first 10 min of each discipline.',
  tri_novice_but_fit: 'You have fitness but may not know your race pacing yet. Err on the side of caution early; the run is where first-timers blow up.',
  intermediate: 'You have race experience. These targets are conservative by 8% — trust them and resist the temptation to go with faster athletes early.',
  experienced: 'No buffer applied — targets are anchored directly to your calibration data. Execute your plan.',
};

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function secsToMmSs(totalSecs: number): string {
  const mins = Math.floor(totalSecs / 60);
  const secs = Math.round(totalSecs % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
