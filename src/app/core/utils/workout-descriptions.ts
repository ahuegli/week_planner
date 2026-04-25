import { PlanMode, PlanPhase } from '../models/app-data.models';

export interface WorkoutDescription {
  whatToDo: string;
  whyItHelps: string;
}

type DescriptionPhase = PlanPhase | 'any';

type SessionDescriptions = Partial<Record<DescriptionPhase, WorkoutDescription>>;

const WEIGHT_LOSS_NOTE =
  'Weight loss mode: keep this mostly moderate and sustainable for 40+ minutes when possible to maximize fat-burning while preserving recovery.';

const ENDURANCE_SESSION_KEYS = new Set<string>([
  'easy_run',
  'long_run',
  'cardio_run',
  'tempo_run',
  'intervals_run',
  'hill_reps_run',
  'easy_ride',
  'long_ride',
  'tempo_ride',
  'intervals_ride',
  'hill_reps_ride',
  'easy_swim',
  'long_swim',
  'intervals_swim',
  'brick_workout',
  'open_water_swim',
]);

const DESCRIPTIONS: Record<string, SessionDescriptions> = {
  easy_run: {
    base: {
      whatToDo:
        'Run at a comfortable pace where you can hold a full conversation. No need to push - this is active recovery.',
      whyItHelps: 'Builds aerobic base and aids recovery between harder sessions.',
    },
    build: {
      whatToDo:
        "Easy pace, stay relaxed. If you feel good, add 5 minutes but don't increase pace.",
      whyItHelps: 'Maintains fitness between speed work sessions without adding fatigue.',
    },
    taper: {
      whatToDo: 'Short and easy. Keep your legs moving without any effort.',
      whyItHelps:
        'Keeps muscles active while your body absorbs the training from previous weeks.',
    },
  },
  long_run: {
    base: {
      whatToDo:
        'Steady, easy pace for the full duration. Walk breaks are fine. Stay hydrated.',
      whyItHelps:
        'Teaches your body to burn fat efficiently and builds endurance for race distance.',
    },
    build: {
      whatToDo:
        'Start easy, finish at a comfortable rhythm. Practice your race-day nutrition if over 75 minutes.',
      whyItHelps:
        'Builds the specific endurance you need on race day. This is your most important session.',
    },
    peak: {
      whatToDo:
        'Your longest run of the plan. Keep pace easy - distance matters more than speed today.',
      whyItHelps: 'Confidence builder - after this, your body is ready for race distance.',
    },
    taper: {
      whatToDo: 'Shorter than recent weeks. Easy pace, enjoy the run.',
      whyItHelps: 'Maintains fitness while allowing full recovery before race day.',
    },
  },
  cardio_run: {
    base: {
      whatToDo:
        'Steady aerobic run at an easy to moderate pace. Keep breathing controlled and effort conversational.',
      whyItHelps:
        'Builds aerobic capacity and general cardiovascular fitness without overloading recovery.',
    },
    build: {
      whatToDo:
        'Sustain a smooth moderate effort from start to finish. Keep form tall and relaxed.',
      whyItHelps:
        'Improves cardio endurance and movement economy for longer sessions in later weeks.',
    },
    any: {
      whatToDo:
        'Run continuously at a sustainable effort where you can still speak in short sentences.',
      whyItHelps:
        'Consistent aerobic work improves heart, lung, and muscular endurance over time.',
    },
  },
  tempo_run: {
    build: {
      whatToDo:
        'Warm up 10 min easy, then run at a pace you could sustain for 40 minutes - comfortably hard, about 7/10 effort. Cool down 5 min.',
      whyItHelps:
        'Improves your lactate threshold - the fastest pace you can sustain without burning out.',
    },
    peak: {
      whatToDo:
        'Same structure as build phase but at a slightly faster pace. Focus on maintaining form when tired.',
      whyItHelps: 'Sharpens race-pace fitness in the final push before taper.',
    },
  },
  intervals_run: {
    build: {
      whatToDo:
        'Warm up 10 min, then alternate fast efforts (2-4 min at 8/10 effort) with equal recovery jogs. Repeat 4-6 times. Cool down 10 min.',
      whyItHelps: "Boosts VO2max - your body's ability to use oxygen at high intensity.",
    },
    peak: {
      whatToDo:
        'Slightly faster and longer intervals than build phase. Focus on controlled breathing and strong form.',
      whyItHelps: 'Peak speed work before taper - this is where race-day sharpness comes from.',
    },
  },
  hill_reps_run: {
    build: {
      whatToDo:
        'Warm up easy, then run hard uphill for 60-120 seconds, jog down to recover, and repeat 6-10 times.',
      whyItHelps: 'Builds running power, economy, and form under fatigue for rolling courses.',
    },
    peak: {
      whatToDo:
        'Fewer reps at high quality. Stay smooth and controlled, especially in the final reps.',
      whyItHelps: 'Keeps speed and strength sharp without adding too much fatigue before taper.',
    },
  },
  easy_ride: {
    base: {
      whatToDo:
        'Spin at a comfortable cadence (80-90 rpm). Zone 2 effort - you can chat easily. Flat terrain or gentle hills.',
      whyItHelps: 'Builds aerobic engine and pedaling efficiency without fatigue.',
    },
    build: {
      whatToDo: 'Easy spin, focus on smooth pedal stroke. Keep heart rate low.',
      whyItHelps: 'Active recovery between harder sessions.',
    },
  },
  long_ride: {
    base: {
      whatToDo:
        'Steady endurance ride. Pack nutrition for rides over 90 min. Stay in zone 2, practice eating and drinking on the bike.',
      whyItHelps:
        'Builds the time-in-saddle endurance that cycling demands. Your body learns to fuel while riding.',
    },
    build: {
      whatToDo:
        'Include some rolling hills but keep overall effort moderate. Practice race nutrition strategy.',
      whyItHelps:
        'Builds race-specific endurance and teaches your body to handle varied terrain.',
    },
    peak: {
      whatToDo:
        'Longest ride of the plan. Moderate effort, focus on nutrition and hydration. Simulate race conditions if possible.',
      whyItHelps: 'Confidence builder - proves your body can handle the distance.',
    },
  },
  tempo_ride: {
    build: {
      whatToDo:
        'Warm up 15 min easy, then ride at a sustained hard effort (sweet spot, zone 3-4) for 20-30 min. Cool down 10 min.',
      whyItHelps:
        'Builds your functional threshold power - the effort you can sustain for an hour.',
    },
  },
  intervals_ride: {
    build: {
      whatToDo:
        'Warm up 15 min. Do 4-6 intervals of 3-5 min at zone 4-5 with 3 min easy spinning between. Cool down 10 min.',
      whyItHelps:
        'Increases VO2max on the bike - your ceiling for sustained hard efforts.',
    },
  },
  hill_reps_ride: {
    build: {
      whatToDo:
        'Find a steep hill (6-10% gradient). Ride hard up for 2-3 minutes, coast down to recover. Repeat 5-8 times.',
      whyItHelps: 'Builds climbing power and mental toughness for hilly events.',
    },
  },
  easy_swim: {
    base: {
      whatToDo:
        'Continuous swimming at a comfortable pace. Focus on technique: long strokes, relaxed breathing, streamlined body position.',
      whyItHelps:
        'Swimming efficiency matters more than fitness. Good technique at easy pace transfers to faster swimming.',
    },
    build: {
      whatToDo:
        'Easy continuous swim. Mix in 100m of backstroke or drill work every 400m to stay loose.',
      whyItHelps: 'Maintains feel for the water between harder sessions.',
    },
  },
  long_swim: {
    base: {
      whatToDo:
        'Steady continuous swim. Break into sets if needed (for example 4x500m with 30s rest). Focus on maintaining consistent stroke rate.',
      whyItHelps: 'Builds swim-specific endurance and teaches pacing over longer distances.',
    },
    build: {
      whatToDo:
        'Continuous swim with some pace variation. Include 200m at tempo effort every 600m.',
      whyItHelps:
        'Simulates race conditions where you need to change pace around buoys and other swimmers.',
    },
  },
  intervals_swim: {
    build: {
      whatToDo:
        'Warm up 400m easy. Main set: 8-10x100m at 85-90% effort with 20s rest between. Cool down 200m easy.',
      whyItHelps:
        'Builds speed and the ability to hold pace when fatigued - critical for open water racing.',
    },
  },
  swim_drills: {
    any: {
      whatToDo:
        'Catch-up drill, fingertip drag, single-arm freestyle, kick sets. 30 min of focused technique work.',
      whyItHelps:
        'Small improvements in technique produce bigger speed gains than fitness alone in swimming.',
    },
  },
  brick_workout: {
    build: {
      whatToDo:
        'Ride for 45-60 min at moderate effort, then immediately transition to a 15-20 min run. Focus on finding your running legs quickly.',
      whyItHelps:
        'Trains your body for the bike-to-run transition - the hardest part of triathlon. Your legs will feel heavy at first, but they adapt.',
    },
  },
  open_water_swim: {
    build: {
      whatToDo:
        'Practice sighting every 6-8 strokes. Swim in a group if possible. Practice race-start surges.',
      whyItHelps:
        "Pool swimming does not prepare you for currents, sighting, and physical contact. Open water practice builds confidence.",
    },
  },
  strength: {
    any: {
      whatToDo:
        'Focus on controlled full-range reps with compound movements. Leave 1-2 reps in reserve on most sets.',
      whyItHelps:
        'Builds force production, improves durability, and reduces injury risk across all training modes.',
    },
  },
  hiit: {
    build: {
      whatToDo:
        'Alternate short hard intervals with equal or slightly longer recovery. Keep quality high and form crisp.',
      whyItHelps:
        'Raises VO2max and improves your ability to tolerate and recover from high-intensity work.',
    },
    any: {
      whatToDo:
        'Use work/rest intervals at high effort, but stop before technique breaks down.',
      whyItHelps:
        'Efficiently improves conditioning and power output in limited training time.',
    },
  },
  mobility: {
    any: {
      whatToDo:
        'Perform guided mobility for hips, ankles, thoracic spine, and hamstrings with slow controlled tempo.',
      whyItHelps:
        'Improves movement quality and recovery so key sessions feel smoother and safer.',
    },
  },
  strength_training: {
    any: {
      whatToDo:
        'Prioritize compound lifts and unilateral stability work with clean, controlled reps and full range of motion.',
      whyItHelps:
        'Increases strength reserve and structural resilience, supporting better performance in every session type.',
    },
  },
};

function normalizeSport(sportType?: string | null): 'running' | 'cycling' | 'swimming' | 'triathlon' {
  const value = (sportType ?? '').toLowerCase();
  if (value.includes('tri')) {
    return 'triathlon';
  }
  if (value.includes('swim')) {
    return 'swimming';
  }
  if (value.includes('cycle') || value.includes('bike')) {
    return 'cycling';
  }
  return 'running';
}

function normalizePhase(phase: string): DescriptionPhase {
  const lower = phase.toLowerCase();
  if (lower === 'base' || lower === 'build' || lower === 'peak' || lower === 'taper') {
    return lower;
  }
  if (lower === 'maintenance') {
    return 'build';
  }
  return 'base';
}

function inferSessionKey(rawSessionType: string, sportType?: string | null): string {
  const session = rawSessionType
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const sport = normalizeSport(sportType);

  const exactMap: Record<string, string> = {
    easy_run: 'easy_run',
    long_run: 'long_run',
    tempo: 'tempo_run',
    tempo_run: 'tempo_run',
    intervals: 'intervals_run',
    intervals_run: 'intervals_run',
    strength_training: 'strength_training',
    strength: 'strength',
    cardio_run: 'cardio_run',
    hiit: 'hiit',
    mobility: 'mobility',
    hill_reps: 'hill_reps_run',
    hill_reps_run: 'hill_reps_run',
    easy_ride: 'easy_ride',
    long_ride: 'long_ride',
    tempo_ride: 'tempo_ride',
    intervals_ride: 'intervals_ride',
    hill_reps_ride: 'hill_reps_ride',
    easy_swim: 'easy_swim',
    long_swim: 'long_swim',
    intervals_swim: 'intervals_swim',
    swim_drills: 'swim_drills',
    brick_workout: 'brick_workout',
    open_water_swim: 'open_water_swim',
  };

  if (exactMap[session]) {
    return exactMap[session];
  }

  if (session.includes('brick')) {
    return 'brick_workout';
  }
  if (session.includes('open_water')) {
    return 'open_water_swim';
  }
  if (session.includes('drill')) {
    return 'swim_drills';
  }

  if (session.includes('easy_run')) return 'easy_run';
  if (session.includes('long_run')) return 'long_run';
  if (session.includes('tempo_run')) return 'tempo_run';
  if (session.includes('interval')) {
    if (session.includes('swim')) return 'intervals_swim';
    if (session.includes('ride') || session.includes('bike') || session.includes('cycling')) return 'intervals_ride';
    if (session.includes('run')) return 'intervals_run';
  }
  if (session.includes('hill_reps') || session.includes('hill')) {
    if (session.includes('ride') || session.includes('bike') || session.includes('cycling')) return 'hill_reps_ride';
    if (session.includes('run')) return 'hill_reps_run';
  }

  if (session.includes('easy_ride')) return 'easy_ride';
  if (session.includes('long_ride')) return 'long_ride';
  if (session.includes('tempo_ride')) return 'tempo_ride';

  if (session.includes('easy_swim')) return 'easy_swim';
  if (session.includes('long_swim')) return 'long_swim';
  if (session.includes('swim_interval')) return 'intervals_swim';

  if (session === 'tempo') {
    return sport === 'cycling' ? 'tempo_ride' : 'tempo_run';
  }

  if (session === 'intervals') {
    if (sport === 'swimming') return 'intervals_swim';
    if (sport === 'cycling') return 'intervals_ride';
    return 'intervals_run';
  }

  if (session === 'hill_reps') {
    return sport === 'cycling' ? 'hill_reps_ride' : 'hill_reps_run';
  }

  if (session === 'easy') {
    if (sport === 'swimming') return 'easy_swim';
    if (sport === 'cycling') return 'easy_ride';
    return 'easy_run';
  }

  if (session === 'long') {
    if (sport === 'swimming') return 'long_swim';
    if (sport === 'cycling') return 'long_ride';
    return 'long_run';
  }

  if (session.includes('bike') || session.includes('ride') || session.includes('cycling')) {
    return 'long_ride';
  }
  if (session.includes('swim')) {
    return 'easy_swim';
  }

  return session;
}

function fallbackForSport(sportType?: string | null): WorkoutDescription {
  const sport = normalizeSport(sportType);
  if (sport === 'cycling') {
    return {
      whatToDo:
        'Cycling follows the same phase structure: base builds endurance, build adds tempo and intervals, peak is highest volume, taper reduces load.',
      whyItHelps: 'Progressive loading improves power and endurance while reducing injury risk.',
    };
  }
  if (sport === 'swimming') {
    return {
      whatToDo:
        'Swimming follows the same phase structure: base emphasizes technique, build adds speed work, peak combines distance and speed, taper freshens you up.',
      whyItHelps: 'Technique plus controlled intensity leads to steady speed gains with less fatigue.',
    };
  }
  if (sport === 'triathlon') {
    return {
      whatToDo:
        'Triathlon combines swim, bike, and run with phase-based progression. Brick workouts usually appear in build phase to train transitions.',
      whyItHelps: 'Balanced training across disciplines builds race-specific durability and transition confidence.',
    };
  }

  return {
    whatToDo:
      'Running follows base, build, peak, and taper. Keep easy days truly easy and focus quality on key sessions.',
    whyItHelps: 'A phased structure builds fitness steadily while managing fatigue.',
  };
}

export function getWorkoutDescription(
  sessionType: string,
  phase: string,
  weekNumber: number,
  mode: PlanMode,
  sportType?: string | null,
): WorkoutDescription {
  const key = inferSessionKey(sessionType, sportType);
  const normalizedPhase = normalizePhase(phase);
  const bySession = DESCRIPTIONS[key];

  const selected = bySession?.[normalizedPhase] ?? bySession?.any ?? bySession?.base;
  const fallback = selected ?? fallbackForSport(sportType);

  if (mode === 'weight_loss' && ENDURANCE_SESSION_KEYS.has(key)) {
    return {
      whatToDo: fallback.whatToDo,
      whyItHelps: `${fallback.whyItHelps} ${WEIGHT_LOSS_NOTE}`,
    };
  }

  const sport = normalizeSport(sportType);
  if (sport === 'triathlon' && key !== 'brick_workout' && key !== 'open_water_swim') {
    return {
      whatToDo: fallback.whatToDo,
      whyItHelps: `${fallback.whyItHelps} In triathlon plans, this works best when balanced against the other two disciplines in the same week.`,
    };
  }

  if (weekNumber >= 1) {
    return fallback;
  }

  return fallback;
}
