import { PlanMode, PlanPhase } from '../models/app-data.models';

export interface WorkoutDescription {
  whatToDo: string;
  whyItHelps: string;
}

type DescriptionPhase = PlanPhase | 'any';

type DurationBucket = 'short' | 'medium' | 'long' | 'very_long';

type DurationBuckets = Partial<Record<DurationBucket, WorkoutDescription>>;

type SessionDescriptions = Partial<Record<DescriptionPhase, WorkoutDescription>> & {
  byDuration?: DurationBuckets;
};

function getDurationBucket(minutes: number, thresholds: { medium: number; long: number; very_long?: number }): DurationBucket {
  if (minutes >= (thresholds.very_long ?? Infinity)) return 'very_long';
  if (minutes >= thresholds.long) return 'long';
  if (minutes >= thresholds.medium) return 'medium';
  return 'short';
}

const WEIGHT_LOSS_NOTE =
  'Weight loss mode: keep this mostly moderate and sustainable for 40+ minutes when possible to maximize fat-burning while preserving recovery.';

const TRIATHLON_CONTEXT_NOTE =
  'Triathlon context: keep execution controlled and do not add extra intensity outside the prescribed session focus.';

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
        'Run at easy aerobic effort (RPE 3-4) where full sentences stay comfortable. Keep stride relaxed and cadence smooth.',
      whyItHelps: 'Builds aerobic capacity and capillary density while keeping recovery cost low.',
    },
    build: {
      whatToDo:
        'Stay easy (RPE 3-4) and clearly below threshold pace. If prescribed, add a little duration but keep effort unchanged.',
      whyItHelps: 'Supports recovery between quality days and preserves running economy without adding high stress.',
    },
    taper: {
      whatToDo: 'Keep this short and easy at RPE 2-3. Finish feeling fresh, not worked.',
      whyItHelps:
        'Maintains neuromuscular rhythm while fatigue drops before race day.',
    },
    byDuration: {
      short: {
        whatToDo:
          'Keep it conversational at RPE 2-3. If breathing drifts up, slow down immediately.',
        whyItHelps:
          'Short easy runs reduce stiffness and improve blood flow with minimal recovery demand.',
      },
      medium: {
        whatToDo:
          'Run steady at RPE 3-4, fully conversational throughout. Keep form tall and relaxed in the final third.',
        whyItHelps:
          'This duration improves aerobic efficiency while still allowing quality work later in the week.',
      },
      long: {
        whatToDo:
          'Treat this as an extended aerobic run at RPE 3-4. Fuel and hydrate if duration goes beyond about 60 minutes, and keep pace controlled.',
        whyItHelps:
          'Extended easy running improves fat oxidation and durability without the musculoskeletal cost of hard sessions.',
      },
    },
  },
  long_run: {
    base: {
      whatToDo:
        'Run easy and steady (RPE 3-4) for the full duration. Walk breaks are acceptable if they keep effort controlled.',
      whyItHelps:
        'Builds aerobic durability and fat-oxidation capacity, which underpin race-distance performance.',
    },
    build: {
      whatToDo:
        'Start controlled, then hold steady aerobic effort. If prescribed, finish with a short race-pace segment and practice fueling for runs over about 75 minutes.',
      whyItHelps:
        'Builds race-specific endurance and fueling execution under fatigue.',
    },
    peak: {
      whatToDo:
        'This is your key long-run rehearsal. Keep most of it easy, control pacing early, and execute race-day fueling exactly as planned.',
      whyItHelps: 'Converts fitness into race readiness by rehearsing pacing, fueling, and late-run durability.',
    },
    taper: {
      whatToDo: 'Reduced long run at easy effort with no hard finish unless explicitly prescribed. Keep cadence smooth and stop with reserve.',
      whyItHelps: 'Maintains endurance signal while reducing fatigue before race week.',
    },
    byDuration: {
      medium: {
        whatToDo:
          'Keep this aerobic and controlled (RPE 3-4) with even pacing. Add a brief controlled lift only if the plan calls for it.',
        whyItHelps:
          'Builds endurance and pacing discipline without the recovery load of very long runs.',
      },
      long: {
        whatToDo:
          'Treat this as core endurance work: mostly Z2 or RPE 3-4, with fueling started early and repeated consistently. Keep effort conservative through the first 75%.',
        whyItHelps:
          'Improves glycogen management, fat metabolism, and muscular resilience for late-race performance.',
      },
      very_long: {
        whatToDo:
          'This is peak long-run territory. Keep effort easy early, fuel on schedule, and hold form through the final quarter rather than forcing pace.',
        whyItHelps:
          'Builds maximal race-specific durability and confidence under controlled fatigue.',
      },
    },
  },
  cardio_run: {
    base: {
      whatToDo:
        'Run continuously at steady aerobic effort (RPE 4-5), below threshold pace. Breathing should stay controlled in short phrases.',
      whyItHelps:
        'Improves aerobic throughput and movement economy without high lactate accumulation.',
    },
    build: {
      whatToDo:
        'Hold smooth moderate effort near LT1 (roughly RPE 5-6), with stable cadence and posture throughout.',
      whyItHelps:
        'Raises aerobic threshold so you can hold faster paces before fatigue rises sharply.',
    },
    any: {
      whatToDo:
        'Sustain a controlled aerobic effort where short phrases are possible but casual chatting is limited.',
      whyItHelps:
        'Develops heart, lung, and muscular endurance needed for longer steady sessions.',
    },
  },
  tempo_run: {
    build: {
      whatToDo:
        'Warm up easy, then run at threshold-tempo effort: around run-threshold pace minus a small margin, or RPE 7-8 if no pace anchor. Cool down easy.',
      whyItHelps:
        'Raises lactate threshold so race pace feels more sustainable for longer.',
    },
    peak: {
      whatToDo:
        'Use race-specific tempo blocks near threshold pace (or RPE 7-8) with strict form control in the final reps. Keep recovery jogs short and purposeful.',
      whyItHelps: 'Sharpens race-pace durability and tolerance to sustained discomfort before taper.',
    },
  },
  intervals_run: {
    build: {
      whatToDo:
        'Warm up thoroughly, then run 2-5 minute reps at 5K to 3K effort (RPE 8-9) with equal jog recovery. Keep pace consistent across reps.',
      whyItHelps: 'Improves VO2max and high-end aerobic power needed for faster race pace.',
    },
    peak: {
      whatToDo:
        'Use fewer high-quality reps at slightly faster pace than build phase, with full control of mechanics. Stop before pace falls off.',
      whyItHelps: 'Maintains top-end speed and neuromuscular sharpness with manageable fatigue.',
    },
  },
  hill_reps_run: {
    build: {
      whatToDo:
        'Warm up well, then run 60-120 second uphill reps at hard controlled effort (RPE 8) with easy jog-down recovery. Drive arms and keep posture tall.',
      whyItHelps: 'Builds running power, economy, and form under fatigue for rolling courses.',
    },
    peak: {
      whatToDo:
        'Reduce rep count and keep quality high. Hit each climb with strong mechanics, then recover fully before the next rep.',
      whyItHelps: 'Keeps speed and strength sharp without adding too much fatigue before taper.',
    },
  },
  easy_ride: {
    base: {
      whatToDo:
        'Ride steady in Z2 at comfortable cadence (about 80-95 rpm). If using power, stay around 56-75% FTP; otherwise use easy conversational effort.',
      whyItHelps: 'Builds aerobic base and pedaling economy with low orthopedic load.',
    },
    build: {
      whatToDo: 'Keep this an easy aerobic spin in low Z2 with relaxed cadence and no hard surges.',
      whyItHelps: 'Supports recovery between hard sessions while maintaining bike-specific aerobic volume.',
    },
    byDuration: {
      short: {
        whatToDo:
          'Short recovery spin in low Z2, smooth cadence, and no hard efforts. Keep breathing easy throughout.',
        whyItHelps:
          'Improves circulation and helps clear residual fatigue without compromising tomorrow sessions.',
      },
      medium: {
        whatToDo:
          'Steady aerobic ride in Z2 with smooth cadence and controlled power. Hydrate consistently and add light fuel if nearing an hour.',
        whyItHelps:
          'Consistent Z2 riding improves mitochondrial function and aerobic durability on the bike.',
      },
      long: {
        whatToDo:
          'Extended Z2 ride with strict pacing discipline and regular fueling and hydration. Keep effort capped so power and heart rate stay aerobic.',
        whyItHelps:
          'Builds endurance metabolism and fueling habits critical for longer triathlon and cycling sessions.',
      },
    },
  },
  long_ride: {
    base: {
      whatToDo:
        'Ride mostly Z2 (about 56-75% FTP or easy-moderate HR) with even output and no spikes. Practice drinking and eating on schedule once rides get longer.',
      whyItHelps:
        'Builds time-in-saddle endurance and trains gut tolerance for race fueling.',
    },
    build: {
      whatToDo:
        'Keep most of the ride aerobic, adding controlled race-pace segments where prescribed (often upper Z2 to low Z3). Execute nutrition exactly as planned.',
      whyItHelps:
        'Builds race-specific bike durability while rehearsing pacing and fueling under fatigue.',
    },
    peak: {
      whatToDo:
        'Key race-rehearsal ride: control early pacing, hold target race zones, and practice full hydration and fueling strategy. Keep intensity disciplined.',
      whyItHelps: 'Confirms race execution strategy and extends fatigue resistance at event-specific demands.',
    },
    byDuration: {
      medium: {
        whatToDo:
          'Steady endurance ride in Z2 with brief low-Z3 blocks only if prescribed. Hold smooth cadence and avoid surges over target.',
        whyItHelps:
          'Builds aerobic bike durability and prepares you for longer weekend sessions.',
      },
      long: {
        whatToDo:
          'Long endurance ride with consistent Z2 pacing, structured fueling, and controlled climbs. Add race-pace blocks only where planned.',
        whyItHelps:
          'Develops cycling-specific endurance, fatigue resistance, and race-day fueling reliability.',
      },
      very_long: {
        whatToDo:
          'Very long ride with strict pacing and full race fueling rehearsal. Practice gear setup, position comfort, and intake timing exactly as you plan to race.',
        whyItHelps:
          'Builds maximal bike endurance and execution confidence for long-course events.',
      },
    },
  },
  tempo_ride: {
    build: {
      whatToDo:
        'Warm up, then ride sustained tempo and sweet-spot work around 76-90% FTP (or RPE 6-7 without power) with smooth cadence. Cool down easy.',
      whyItHelps:
        'Raises functional threshold and muscular endurance with lower recovery cost than all-out interval work.',
    },
  },
  intervals_ride: {
    build: {
      whatToDo:
        'Warm up fully, then complete 3-5 minute reps at about 91-120% FTP (or RPE 8-9) with easy spin recoveries. Keep power and cadence steady rep to rep.',
      whyItHelps:
        'Improves VO2max and high-power repeatability for climbs, surges, and race efforts.',
    },
  },
  hill_reps_ride: {
    build: {
      whatToDo:
        'Use a moderate-to-steep climb and ride 2-4 minute uphill reps at hard controlled effort, recovering fully on the descent. Stay seated for most reps unless terrain requires standing.',
      whyItHelps: 'Builds climbing-specific force and aerobic power while improving pacing under gradient changes.',
    },
  },
  easy_swim: {
    base: {
      whatToDo:
        'Swim easy continuous aerobic pace with relaxed breathing and long strokes. Keep effort around CSS +10 to +15 sec/100m, or easy RPE if untested.',
      whyItHelps:
        'Builds aerobic swim capacity while reinforcing efficient mechanics at low fatigue cost.',
    },
    build: {
      whatToDo:
        'Keep this recovery-aerobic and smooth. Add short drill segments to maintain catch and body-line quality.',
      whyItHelps: 'Maintains feel for the water and technique consistency between harder sets.',
    },
    byDuration: {
      short: {
        whatToDo:
          'Short recovery swim focused on rhythm, relaxed exhale, and clean catch. Keep effort very easy and avoid speed work.',
        whyItHelps:
          'Restores shoulder range and water feel with minimal systemic fatigue.',
      },
      medium: {
        whatToDo:
          'Steady aerobic swim near CSS +8 to +12 sec/100m, with one short drill block to reset form quality. Hold consistent stroke count.',
        whyItHelps:
          'Builds swim endurance while preserving technical efficiency under moderate volume.',
      },
      long: {
        whatToDo:
          'Long aerobic swim in controlled blocks with short rests to protect form. Focus on body line, bilateral breathing, and consistent pacing.',
        whyItHelps:
          'Extends aerobic swim capacity and reinforces mechanics when fatigue would normally degrade technique.',
      },
    },
  },
  long_swim: {
    base: {
      whatToDo:
        'Swim sustained aerobic sets at roughly CSS +5 to +10 sec/100m, with short rests to keep stroke quality high. Keep pacing even from first set to last.',
      whyItHelps: 'Builds swim-specific endurance and pacing control for longer race swims.',
    },
    build: {
      whatToDo:
        'Use endurance sets with planned pace changes: mostly aerobic with periodic tempo segments near CSS pace. Keep turns and breakouts efficient.',
      whyItHelps:
        'Improves your ability to change pace around race dynamics while staying technically efficient.',
    },
    byDuration: {
      medium: {
        whatToDo:
          'Steady aerobic swim with one controlled tempo segment near CSS pace. Keep recoveries short and technique stable.',
        whyItHelps:
          'Builds endurance and controlled pace-change ability useful in open-water packs and buoy turns.',
      },
      long: {
        whatToDo:
          'Long endurance swim with repeated aerobic blocks and planned tempo inserts near CSS. Track stroke count to prevent form drift as fatigue rises.',
        whyItHelps:
          'Develops long-course swim durability and pace discipline that transfers directly to race execution.',
      },
      very_long: {
        whatToDo:
          'Very long endurance swim using structured repeats with short rests and strict pacing control. Prioritize stroke quality and bilateral breathing all the way through.',
        whyItHelps:
          'Extends aerobic swim ceiling and prepares you to hold efficient form late in long races.',
      },
    },
  },
  intervals_swim: {
    build: {
      whatToDo:
        'Warm up thoroughly, then complete short repeats near CSS to CSS-3 sec/100m with controlled rest. Keep strokes crisp and pace repeatable.',
      whyItHelps:
        'Improves swim speed endurance and your ability to hold pace under rising fatigue.',
    },
  },
  swim_drills: {
    any: {
      whatToDo:
        'Use focused drill blocks (for example catch-up, fingertip drag, single-arm) with easy swim between reps. Prioritize body line, catch timing, and relaxed breathing.',
      whyItHelps:
        'Technique improvements reduce drag and improve propulsion, giving free speed at every effort level.',
    },
  },
  brick_workout: {
    build: {
      whatToDo:
        'Ride at planned race effort, then transition quickly into a controlled run without extra standing or delay. Expect heavy legs for the first minutes and settle cadence before pacing up.',
      whyItHelps:
        'Trains bike-to-run neuromuscular transfer and pacing discipline under transition fatigue.',
    },
  },
  open_water_swim: {
    build: {
      whatToDo:
        'Practice sighting every 6-10 strokes, bilateral breathing, and maintaining straight lines between landmarks. Include short race-start surges and drafting if safe.',
      whyItHelps:
        'Builds open-water skills that pool sessions do not fully cover: navigation, contact tolerance, and pace control in variable conditions.',
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
        'Use short high-quality work intervals with controlled recoveries. Keep technique sharp and stop the set when output drops materially.',
      whyItHelps:
        'Raises VO2max and improves repeatability of high-intensity efforts.',
    },
    any: {
      whatToDo:
        'Use structured hard/easy intervals at high effort while preserving movement quality throughout.',
      whyItHelps:
        'Delivers strong aerobic and anaerobic stimulus when time is limited.',
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
    run: 'easy_run',
    running: 'easy_run',
    easy_run: 'easy_run',
    long_run: 'long_run',
    ride: 'easy_ride',
    bike: 'easy_ride',
    cycling: 'easy_ride',
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
    swim: 'easy_swim',
    swimming: 'easy_swim',
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
        'Follow the planned session focus at controlled effort, and avoid stacking hard intensity on consecutive days unless specifically prescribed.',
      whyItHelps:
        'Consistent, well-balanced training across swim, bike, and run builds fitness while keeping fatigue manageable.',
    };
  }

  return {
    whatToDo:
      'Running follows base, build, peak, and taper. Keep easy days truly easy and focus quality on key sessions.',
    whyItHelps: 'A phased structure builds fitness steadily while managing fatigue.',
  };
}

function shouldIncludeTriathlonContext(sportType: string | null | undefined, sessionKey: string): boolean {
  return normalizeSport(sportType) === 'triathlon' && (sessionKey === 'brick_workout' || sessionKey === 'open_water_swim');
}

const DURATION_THRESHOLDS: Partial<Record<string, { medium: number; long: number; very_long?: number }>> = {
  easy_run:   { medium: 45, long: 75 },
  long_run:   { medium: 60, long: 90, very_long: 120 },
  easy_ride:  { medium: 45, long: 75 },
  long_ride:  { medium: 60, long: 90, very_long: 150 },
  easy_swim:  { medium: 25, long: 45 },
  long_swim:  { medium: 35, long: 55, very_long: 75 },
};

export function getWorkoutDescription(
  sessionType: string,
  phase: string,
  weekNumber: number,
  mode: PlanMode,
  sportType?: string | null,
  durationMinutes?: number,
): WorkoutDescription {
  const key = inferSessionKey(sessionType, sportType);
  const normalizedPhase = normalizePhase(phase);
  const bySession = DESCRIPTIONS[key];

  // Duration-bucket resolution (optional — only for supported session types)
  if (durationMinutes != null && bySession?.byDuration) {
    const thresholds = DURATION_THRESHOLDS[key];
    if (thresholds) {
      const bucket = getDurationBucket(durationMinutes, thresholds);
      const bucketDesc = bySession.byDuration[bucket];
      if (bucketDesc) {
        // Apply weight-loss and triathlon suffixes on the bucket result too
        let result = bucketDesc;
        if (mode === 'weight_loss' && ENDURANCE_SESSION_KEYS.has(key)) {
          result = { whatToDo: result.whatToDo, whyItHelps: `${result.whyItHelps} ${WEIGHT_LOSS_NOTE}` };
        }
        if (shouldIncludeTriathlonContext(sportType, key)) {
          result = { whatToDo: `${result.whatToDo} ${TRIATHLON_CONTEXT_NOTE}`, whyItHelps: result.whyItHelps };
        }
        return result;
      }
    }
  }

  const selected = bySession?.[normalizedPhase] ?? bySession?.any ?? bySession?.base;
  const fallback = selected ?? fallbackForSport(sportType);

  if (mode === 'weight_loss' && ENDURANCE_SESSION_KEYS.has(key)) {
    return {
      whatToDo: fallback.whatToDo,
      whyItHelps: `${fallback.whyItHelps} ${WEIGHT_LOSS_NOTE}`,
    };
  }

  if (shouldIncludeTriathlonContext(sportType, key)) {
    return {
      whatToDo: `${fallback.whatToDo} ${TRIATHLON_CONTEXT_NOTE}`,
      whyItHelps: fallback.whyItHelps,
    };
  }

  if (weekNumber >= 1) {
    return fallback;
  }

  return fallback;
}
