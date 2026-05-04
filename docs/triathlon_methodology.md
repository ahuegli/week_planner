# Triathlon Methodology Reference (v1)

Research-backed periodisation principles for the plan-template engine's
triathlon mode. Companion to training-methodology (running) and
wellness-methodology.

Sources: Friel, Fitzgerald, Dixon (Purple Patch), Skiba, Mujika,
Bernhardt, Sutton, peer-reviewed swim/bike/run multisport literature.

## Core principle (Friel)
"The closer in time you get to the race, the more like the race your
workouts must become."

For triathlon this principle is amplified: race-specificity isn't only
about pace and distance, it's about the **sequence under fatigue**.
The bike-to-run transition is where most amateur triathlons unravel,
and most plans under-prescribe brick training as a result.

## Design principle for time-constrained athletes
Triathlon has a hard frequency floor that running doesn't. To maintain
three disciplines you need at minimum 5 sessions/week — anything
below loses a discipline. **Tier 2 is not viable for triathlon.**
Tier 3 is feasible only for sprint and lower olympic distances, and
even then with caveats.

The honest framing: if a user has only 2 weekly slots, recommend a
duathlon (run-bike-run) or single-discipline race instead. Don't ship
a Tier 2 triathlon plan that can't deliver finish-line readiness.

## Frequency tiers

### The tier system

| Tier | Total sessions | Swim | Bike | Run | Strength | Use case |
|------|---------------|------|------|-----|----------|----------|
| 4+ (textbook) | 8–12 | 3 | 3 | 3–4 | 2 | Performance-focused, 70.3/140.6 capable |
| 3 (compressed) | 5–6 | 2 | 2 | 2 | 1 | Sprint/olympic capable; brick weekends |
| 2 (not viable) | — | — | — | — | — | Recommend duathlon or single-discipline instead |

**Tier 5+ (high-volume / pro-curious)** with double sessions and 14–20
hours/week is out of scope for v1. These athletes are typically coached
1:1 and don't use prescriptive apps.

### Tier alone is insufficient — pair with weeklyHours

The same `weeklyHours` companion input from the running engine applies.
A Tier 4+ athlete training 8 hours/week is a very different programme
from one training 16 hours/week, even at the same session count.
Triathlon hours scale roughly with race distance:

| Race | Tier 4+ peak hours/week | Tier 3 peak hours/week |
|------|------------------------|-------------------------|
| Sprint | 6–10 | 4–6 |
| Olympic | 8–12 | 6–8 |
| 70.3 | 10–15 | not recommended below 8 |
| 140.6 | 12–20 | not viable |

### Preservation hierarchy — what to cut last

When forced to drop sessions, the order to preserve is:
**long ride > long run > brick > race-pace bike > swim threshold > easy filler.**

Two important nuances:
- **Swim is the most fragile discipline** — adaptations decay fastest without consistency. A swim-once-a-week plan produces noticeable degradation within 2 weeks. If swim drops below 1×/week for >2 consecutive weeks, the engine should flag race readiness risk.
- **Swim also rebuilds fastest when technique is maintained.** Adaptations recovered within 1–2 weeks of resumed frequency at ≥2×/week. The engine should not flag race-readiness concern for short-duration swim gaps (≤14 days) if the athlete returns to consistent frequency. The combination — fast decay, fast rebuild — means swim is the most schedule-sensitive but also the most recoverable discipline.
- **Bike volume is the cheapest aerobic stimulus** — high training stress per unit injury risk. When time allows expansion, expand the bike before the run.

### Tier 4+ programme structure

Standard 9-session week (sprint/olympic build phase):

| Day | Session 1 | Session 2 |
|-----|-----------|-----------|
| Mon | Swim technique | Strength |
| Tue | Run quality (LT2 or VO2max) | — |
| Wed | Bike intervals | Swim endurance |
| Thu | Run easy or tempo | Strength |
| Fri | Swim threshold | — |
| Sat | Long bike + brick run | — |
| Sun | Long run | — |

Doubles cluster Wed and the strength days. Sat is the workhorse — long
bike with optional brick run, the closest weekly approximation of race
demand. 70.3 and 140.6 add a second long-bike or long-run day on
consecutive days (race-rehearsal weekends in build phase).

### Tier 3 programme structure

Compressed 6-session week (sprint/olympic only):

| Day | Session |
|-----|---------|
| Mon | Strength + short swim (technique 30 min) |
| Tue | Run quality (LT2 or VO2max) |
| Wed | Bike intervals (60–75 min) |
| Thu | Swim threshold (45 min) |
| Sat | Brick: long bike + run off the bike |
| Sun | Long run |

Each session does double duty. The brick on Saturday is non-negotiable
— it's the only session that trains the discipline that breaks
amateurs. No optional cross-training; every session is purposeful.

### What does not work in triathlon
- Tier 2 (frequency floor not met)
- Pure polarised distribution at Tier 3 (volume too low to dilute)
- Norwegian sub-threshold method below Tier 4+ with double-day capacity
- 70.3 below Tier 3 minimum hours
- 140.6 below Tier 4+ with 24+ week build

## Zone framework — sport-specific

Zones are **not interchangeable across disciplines**. A swimmer's
threshold pace per 100m doesn't translate to bike watts or run pace.
Each discipline anchors zones to its own benchmark test.

### Swim zones (anchored to T-pace / CSS)

CSS (Critical Swim Speed) ≈ pace per 100m sustainable for ~1500m.
Tested via 400m time trial + 200m time trial; CSS = (400 time − 200 time) / 2 per 100m.

| Zone | Label | Anchor | Use |
|------|-------|--------|-----|
| Z1 | Recovery / technique | CSS + 10–15s/100m | Drills, technique sets |
| Z2 | Aerobic | CSS + 5–10s/100m | Endurance sets, long swims |
| Z3 | Threshold / CSS | CSS pace | Main set workhorse |
| Z4 | VO2max | CSS − 3–5s/100m | Short reps, 100m–200m |
| Z5 | Sprint | flat-out | 25–50m efforts |

### Bike zones (anchored to FTP)

FTP (Functional Threshold Power) ≈ 1-hour sustainable power. Tested
via 20-min TT × 0.95, or ramp test. Power-meter users only — HR-only
users fall back to RPE-anchored prescription.

| Zone | Label | % FTP | Use |
|------|-------|-------|-----|
| Z1 | Recovery | <55% | Active recovery, post-key-session spin |
| Z2 | Endurance | 56–75% | Long rides, base building |
| Z3 | Tempo / sweet-spot | 76–90% | Aerobic strength, time-efficient stimulus |
| Z4 | Threshold (FTP) | 91–105% | LT2 work, race-specific for 70.3/140.6 |
| Z5 | VO2max | 106–120% | 3–8 min reps |
| Z6 | Anaerobic | 121–150% | 30s–2 min reps; sprint/olympic specific |

**Sweet-spot (Z3 high)** deserves emphasis for time-constrained
triathletes — produces 80–90% of threshold adaptation at lower
recovery cost. Backbone of compressed programmes.

### Run zones

Inherit from running methodology v4 — five-zone Z1–Z5 split with
LT1/LT2 distinction. Pace anchored to recent race time or threshold
test, with the standard caveat that **run zones in triathlon are
prescribed off fresh-leg pace** but executed at race-day on tired
legs. Long-run race-pace work specifically trains this discrepancy.

## Race-distance training emphasis

### Sprint (750m / 20km / 5km)

Distance: 1–1.5 hours race time for amateurs. Energy system: glycolytic-
heavy with strong aerobic base. Pace is closer to LT2/VO2max throughout.

**Emphasis:** VO2max and LT2 across all three disciplines.
- **Swim:** CSS and faster (Z3–Z4) work dominant; technique critical given short distance amplifies inefficiency cost
- **Bike:** sweet-spot to FTP work; sprint course often non-drafting and short, so sustained power matters more than fuelling
- **Run:** 5K-pace VO2max + LT2; off-bike run at race pace key

**Plan length:** 8–12 weeks
**Brick frequency:** 1×/week minimum, 2× in peak phase
**Long-session progression (Sprint):**
| Session | Starts | Peaks | % of running volume |
|---|---|---|---|
| Long run | 60 min / 8 km | 80 min / 12-14 km | 30-35% |
| Long bike | 1.5h | 2-2.5h | — |
| Long swim | 1000m | 1500-2000m | — |

### Olympic (1.5km / 40km / 10km)

Distance: 2–3 hours race time. Energy system: aerobic-dominant with
sustained LT2 effort. Modal pacing sits at LT2.

**Emphasis:** LT2 primary across all disciplines, VO2max secondary,
endurance third.
- **Swim:** CSS work + endurance volume (~3000m sets)
- **Bike:** sweet-spot to FTP, longer intervals (10–20 min reps)
- **Run:** LT2 tempo + 10K-pace work; off-bike run develops late-race resilience

**Plan length:** 12–16 weeks
**Brick frequency:** 1–2×/week, weekly in build phase
**Long-session progression (Olympic):**
| Session | Starts | Peaks | % of running volume |
|---|---|---|---|
| Long run | 70 min / 10 km | 95 min / 16-18 km | 30-35% |
| Long bike | 2h | 3-3.5h | — |
| Long swim | 1500m | 2500-3000m | — |

### Half Ironman / 70.3 (1.9km / 90km / 21.1km)

Distance: 4–7 hours race time for amateurs. Energy system: aerobic with
fuelling becoming a key performance variable. Pace sits at LT1
(marathon-equivalent for run; ~80–85% FTP for bike).

**Emphasis:** aerobic endurance primary, LT1 secondary, LT2 tertiary.
- **Swim:** endurance-dominant (~3000–4000m sets), CSS work for race-pace anchor
- **Bike:** Z2–Z3 long volume, race-pace efforts (~80% FTP) inside long rides
- **Run:** half-marathon pace + race-pace bricks; long run off the bike with last 30% at race pace

**Reverse periodisation suits experienced athletes** with existing threshold capacity from prior single-sport training. Build aerobic volume first, then layer LT2 and race-pace work in final 6–8 weeks.
**Beginner-to-70.3 athletes** (no prior triathlon, coming from another endurance background such as marathon running) benefit from traditional periodisation: aerobic base for 6–8 weeks, then race-specific work. The engine should default reverse vs traditional based on an experienceLevel parameter.

**Plan length:** 16–24 weeks
**Brick frequency:** weekly in base, 2×/week in build
**Long-session progression (70.3):**
| Session | Starts | Peaks | % of running volume |
|---|---|---|---|
| Long run | 80 min / 12 km | 110-125 min / 22-25 km | 30-35% |
| Long bike | 2.5h | 4-5h | — |
| Long swim | 2000m | 3500-4000m | — |
**Race-rehearsal weekends:** 2–3 in build phase — long ride Saturday + medium-long run Sunday, training back-to-back fatigue

### Ironman / 140.6 (3.8km / 180km / 42.2km)

Distance: 9–17 hours race time for amateurs. Energy system: pure
aerobic, fuelling and pacing dominate over fitness ceiling. Pace sits
below LT1 — for most amateurs, comfortably aerobic with disciplined
restraint.

**Emphasis:** aerobic endurance overwhelming, durability critical,
intensity work is supportive only.
- **Swim:** aerobic endurance (~4000–5000m sets) plus CSS work to keep range
- **Bike:** Z2 dominant with sweet-spot work for muscular endurance; long rides are the centrepiece
- **Run:** aerobic volume with marathon-pace work; long run off the bike trains both pacing discipline and durability

**Reverse periodisation suits experienced athletes** with existing 
threshold capacity from prior single-sport training. Build aerobic 
volume first, then layer LT2 and race-pace work in final 6–8 weeks.

**Beginner-to-70.3 athletes** (no prior triathlon, coming from another 
endurance background such as marathon running) benefit from traditional periodisation: aerobic base for 6–8 weeks, then race-specific work. 
The engine should default reverse vs traditional based on an `experienceLevel` parameter.

**Plan length:** 24–30 weeks (true beginners 36+ weeks)
**Brick frequency:** weekly in build, race-rehearsal blocks 4–6 weeks out
**Long-ride caps for amateurs:** 5h for 70.3, 6h for 140.6. Above 6h, fatigue cost exceeds adaptation benefit. Substitute back-to-back 
race-rehearsal days (long ride Sat + long run Sun) instead of pushing single rides longer.
**Long-ride caps for amateurs:** 5h for 70.3, 6h for 140.6. Above 6h, fatigue cost exceeds adaptation benefit. Substitute back-to-back race-rehearsal days (long ride Sat + long run Sun) instead of pushing single rides longer.
**Long-session progression (140.6):**
| Session | Starts | Peaks | % of running volume |
|---|---|---|---|
| Long run | 90 min / 14 km | 140-180 min / 28-32 km | 30-35% |
| Long bike | 3h | 5-6h | — |
| Long swim | 2500m | 4500-5000m | — |

**Note:** Long run for 140.6 caps at marathon long-run cap (32 km).
Above 32 km, fatigue cost exceeds adaptation benefit. Substitute 
back-to-back race-rehearsal days instead.
**Race-rehearsal weekends:** 3–4 in build phase — long ride 5–6 hours Saturday + 2–2.5 hour run Sunday, training the consecutive-day load that mimics race demand

**Common amateur error:** running too much in 140.6 build. Run injuries
end Ironman attempts more often than bike or swim limitations. Cap
running volume below what the athlete could handle for a stand-alone
marathon — the overall training stress is already high.

## Brick training

Bricks (back-to-back discipline transitions, almost always bike-to-run)
are the single most race-specific session in triathlon. Three brick
formats matter:

**Transition brick:** short bike → short run (e.g. 30 min bike + 10–15
min run). Trains the neuromuscular shift in the first km off the bike,
where most amateurs run wildly off-pace. Light recovery cost. Frequency:
weekly across all phases for all distances.

**Race-simulation brick:** sustained bike at race pace → run at race
pace (e.g. 60–90 min bike + 30–45 min run for olympic; 2–3h bike +
60–90 min run for 70.3). Trains pacing discipline and fuelling under
realistic conditions. Frequency: weekly in build phase, 2×/week in
peak for 70.3/140.6.

**Race-rehearsal brick:** full long ride + medium-long run, executed at
projected race pace with race-day nutrition. The closest weekly
approximation of race demand. Frequency: 2–4 times in the final 8
weeks of build for 70.3 and 140.6 only — too taxing for sprint/olympic
weekly use.

**Reverse bricks (run-to-bike)** have niche value for duathletes and
some olympic-distance athletes; not core programming for triathlon.

**Brick rules:**
- Never schedule a brick the day before a long run
- Brick days are quality days — no other quality session in 24h
- Run pace off the bike runs ~10–20s/km slower than fresh-legs pace at the same RPE; prescribe accordingly

## Periodisation phases

**Base** (8–12 weeks for 70.3/140.6, 4–6 weeks for sprint/olympic):
- Aerobic volume across all three disciplines
- Swim technique focus — long-tail return on cleaning up form early
- Bike Z2 endurance, sweet-spot maintenance
- Run easy mileage with strides
- Strength training 2× heavy + plyo (running methodology applies directly)
- Light bricks weekly (transition format)

**Build** (8–12 weeks):
- Race-specific intensity per distance emphasis above
- Bricks become race-simulation format
- Long rides + long runs grow toward peak
- Strength reduces to 1×/week, maintenance focus
- Race-rehearsal weekends introduced for 70.3/140.6

**Peak** (2–4 weeks):
- Race-pace efforts dominant
- Volume slightly reduced, intensity sharp
- Tune-up race or simulation event 3–5 weeks out (sprint or olympic for 70.3, half-iron simulation for 140.6)
- Strength minimal (1× light)

**Taper** — calibrated by distance, longer than running equivalents
because of fatigue accumulation across three disciplines:
- Sprint: 7–10 days, volume −30 to −40%, intensity maintained
- Olympic: 10–14 days, volume −40 to −50%
- 70.3: 14–21 days, volume −40 to −60%
- 140.6: 21 days, volume −50 to −70%, with carefully placed sharpener sessions
- Frequency maintained — do not drop sessions
- One short brick in race week to maintain neuromuscular pattern

## Strength training

Inherits the running methodology v4 framework with triathlon-specific
modifications:

- **Posterior chain emphasis** continues — deadlifts, hip thrusts, single-leg work
- **Pulling work added** — swim-specific lat and rear-delt strength (pull-ups, rows, face pulls). Most runners-turned-triathletes are weak in pulling patterns
- **Plyometrics** preserved for run economy; reduced volume vs runner equivalent because of higher overall training load
- **Frequency** by tier: Tier 4+ 2× base/build, 1× peak/taper. Tier 3 1×/week year-round (lives on a non-quality day)
- **Never zeroed** — same Berryman dose-response logic as running

**Programme priorities:**
- Heavy compound lower body (squat, deadlift variants)
- Single-leg work (Bulgarian split squats, step-ups)
- Pulling patterns for swim
- Core anti-rotation
- Plyometrics for run economy
- Avoid: high-rep "triathlon circuits" — minimal economy benefit, high recovery cost

## Mobility and recovery

Triathlon's three-discipline load makes recovery infrastructure more
important than in single-sport training. Mobility prescription:

**Dynamic warm-ups** before key sessions (5–10 min) — same protocol as running
**Post-session mobility** (5–10 min) — best done warm
**Standalone sessions** (yoga, foam rolling) — 1–2× weekly at Tier 4+, 2× at Tier 3

**High-value targets:**
- Hip flexor length (cycling shortens these aggressively)
- Thoracic rotation (matters for swim catch and run efficiency)
- Ankle dorsiflexion
- Shoulder flexion and external rotation (swim-specific)
- Single-leg balance / proprioception

## Open-water swim specifics

Pool-trained swimmers underperform on race day if open-water specific
preparation is missing. Engine should prescribe:

- **Open-water sessions** in build/peak phase: minimum 3–4 sessions in
  the 8 weeks pre-race; one within 2 weeks of race day
- **Sighting drills** in pool sessions: every 6–10 strokes lift head
  to spot a target
- **Wetsuit acclimation** (where applicable): 2–3 sessions wearing
  wetsuit before race day; first wetsuit swim in pool environment
- **Mass-start practice**: contact swimming, drafting, breathing on
  both sides — best learned at masters-style group sessions

For users without open-water access, the engine should flag the gap
explicitly and recommend in-pool simulations (kick without goggles,
bilateral breathing, sighting drills) rather than silently substituting.

## Transitions (T1, T2)

Often ignored by plans. Free time on race day for trivial practice cost.

- **Transition practice** in final 4 weeks: 2–3 sessions, 10–15 min each
- **T1 (swim → bike):** wetsuit removal, helmet on first, mounting line discipline
- **T2 (bike → run):** dismount line, racking, shoe transition
- **Brick run** can incorporate quick T2 simulation
- **Race-week**: full rehearsal of transition layout once

Sprint and olympic specifically reward fast transitions — at sprint
distance, 60s saved in transitions matches an entire training cycle's
swim improvement.

## Race-day execution

Triathlon plans that don't address race-day pacing and fuelling fail
even fit athletes. The engine should produce a race-day plan in the
final 2 weeks covering:

- **Pacing targets per discipline** based on recent threshold tests
- **Fuelling plan**: g/h carbohydrate target by distance (sprint
  60–90 g/h not critical; olympic 60 g/h; 70.3 80–100 g/h; 140.6
  90–120 g/h with some athletes tolerating more)
- **Hydration plan** anchored to expected ambient conditions
- **Pre-race nutrition** windows (final 24h, race morning)
- **Bailout/contingency rules**: cramp protocol, mechanical, missed nutrition

This is the single most differentiated piece vs single-sport plans —
worth investing in product surface area.

## Adaptive replanning (triathlon-specific)

Inherits the running engine logic, with discipline-specific additions:

**Missed session sensitivity by discipline:**
- Missed swim: highest concern — adaptations decay fastest. Prioritise next swim slot.
- Missed bike: lowest concern at Tier 4+, since bike is the cheapest aerobic stimulus to make up; moderate concern at Tier 3.
- Missed run: moderate — but never stack missed run with next long run.
- Missed brick: high concern in build/peak phase. Replan to keep brick weekly.

**Tier sensitivity:**
- Tier 4+: standard running-engine logic per discipline
- Tier 3: missing any session is 17% of weekly stimulus — restructure rather than stack

**Pace updates:** discipline-specific tests every 4–6 weeks (CSS swim
test, FTP bike test, run threshold test) feed pace zones for each
discipline independently. Race results from single-sport tune-up
events feed run zones via Riegel/Cameron.

**Acute:chronic workload** — same flag logic as running, but applied
to total triathlon training stress score (TSS) rather than km, since
km-only metrics undercount swim and bike load.

**Cross-discipline injury substitution:**
- Run injury: maintain swim and bike frequency; substitute easy bike for missed runs
- Bike injury: limited substitution available — focus on swim and run, accept fitness loss in cycling
- Swim injury (shoulder typically): substitute kick-only sets, pull-buoy work, or pause swim entirely; bike/run unaffected

## Universal rules

- **Discipline preservation hierarchy** when cutting: protect swim frequency first (decays fastest), bike volume second (cheapest to maintain), run third
- **Hard-easy alternation** across disciplines, not within — a hard bike day can sit next to a hard swim day if the muscle systems differ enough; a hard bike followed by hard run within 24h is the classic overtraining trap
- **Weekly long ride and long run** never on the same day at full duration — race-rehearsal weekends are exception, with reduced run on day 2
- **Recovery week every 4th**: −20–30% across all three disciplines, intensity maintained
- **Strides year-round** for run discipline (running methodology)
- **Strength year-round**, never zeroed
- **Sleep > supplements** — recovery debt accumulates faster across three disciplines than single-sport
- **Long run as % of running volume**: 30-35% of weekly running 
  volume across all triathlon distances. The percentage applies to 
  RUNNING volume only, not total triathlon volume — running has its 
  own injury/fatigue profile that doesn't dilute by adding bike or 
  swim hours. An athlete running 4 hours/week gets long run capped 
  at ~80 minutes regardless of how much bike/swim they're doing.

## Canonical units per session type (shared with running methodology)

Sessions are sized in different units depending on what the methodology
actually optimizes. Forcing one unit on all sessions misrepresents
methodology and produces poor plans. The engine treats each session
type as canonical in the unit below; other units are derived.

| Session type | Canonical unit | Intensity anchor | Used in plans |
|---|---|---|---|
| long_run | distance (km) | pace + RPE | run + tri |
| easy_run | distance (km) | pace + RPE | run + tri |
| run_intervals | time + reps | pace per rep + RPE | run + tri |
| tempo_run | distance (km) | pace + RPE | run + tri |
| marathon_pace_run | distance (km) | pace | run + tri |
| recovery_run | time (min) | RPE | run + tri |
| strides | reps × time | RPE | run + tri |
| long_bike | time (h) | power/HR + RPE | tri |
| sweet_spot_bike | time + intervals | % FTP | tri |
| ftp_bike | time + intervals | % FTP | tri |
| recovery_bike | time (min) | RPE | tri |
| swim_endurance | distance (m) | pace per 100 + RPE | tri |
| swim_threshold | distance + reps | CSS pace | tri |
| swim_technique | time (min) | drill-anchored | tri |
| brick_bike | time (h) | power/HR + RPE | tri |
| brick_run | distance (km) OR time (min) | pace + RPE | tri |
| strength | time (min) | RPE | run + tri |
| mobility | time (min) | RPE | run + tri |
| cross_training | time (min) | RPE | run + tri |

**Rule of thumb for which unit dominates:**
- Endurance run/swim sessions are canonical in distance (methodology
  thinks "20 km long run", "3000m endurance swim")
- Cycling sessions are canonical in time (methodology thinks
  "3-hour long ride", power/HR drives intensity not pace)
- Interval sessions of any sport are canonical in time+reps (the
  structure defines the session)
- Strength and mobility are canonical in time (workout duration)

**Deriving the non-canonical:**
- Distance from time: `distance = time × pace × intensityFactor`
- Time from distance: `time = distance × pace × intensityFactor`
- Pace anchors: `runThresholdSecPerKm` for run, FTP for bike, CSS for
  swim. Without these, RPE provides intensity anchor.

**Brick run is the exception** — it's prescribed in time during base
phase (transition bricks: "10-15 min off the bike to find legs") and
in distance during build/peak (race-simulation and race-rehearsal:
"5 km off the bike at race pace"). Both formats are valid; the engine
picks based on phase.

## Progression mechanism (shared with running methodology)

All long sessions in any plan follow the same progression mechanic:

**Linear ramp within phase, deload reset, capped at peak target.**

For a session in phase P with N total weeks in that phase, week W
within phase:
- progressionScaler = phaseStart + (phaseEnd - phaseStart) × ((W-1) / (N-1))
- baseValue × progressionScaler = current target

Phase ramp ranges (multipliers applied to baseValue):

| Phase | Ramp start | Ramp end |
|---|---|---|
| Base | 0.70 | 1.00 |
| Build | 0.90 | 1.15 |
| Peak | 1.05 | 1.15 |
| Taper | 1.00 → 0.40 (varies by race distance) | — |

**Deload reset:**
- Every 4th week, multiplier is reduced by 30% (×0.70)
- Week after deload returns to the linear ramp position, NOT to a
  reduced post-deload value
- This means deload is a temporary recovery week, not a permanent
  setback

**Hard caps:**
- Long run weekly increase capped at 10% (Pfitzinger rule)
- Total weekly volume increase capped at 10% (general rule)
- Distance ceilings per race distance (see race-distance tables) are
  absolute — the ramp doesn't push above them

**Fitness inputs that scale baseValue:**
- `experienceLevel` / `level`: multiplier 0.85 (true_beginner/novice)
  to 1.15 (experienced/advanced)
- `weeklyHours`: multiplier 0.65 (low) to 1.50 (high) of standard
- `endurancePedigree` (triathlon only): multiplier 0.95 (none) to
  1.10 (strong)
- `runThresholdSecPerKm` / `cssSecondsPer100m` / FTP: not direct
  duration scalers, but determine pace targets which influence
  distance achievable in given time

These multipliers compound. An experienced 140.6 athlete with strong
endurance pedigree training at high weekly hours: `1.15 × 1.10 × 1.50
= 1.90× of standard baseValue` for long sessions. Still capped by
absolute ceilings (32km long run, 6h long bike).

## Fitness inputs hierarchy (triathlon-specific)

Triathlon requires per-discipline calibration. The engine uses a 
fallback chain: explicit threshold values > recent test/race results 
> RPE-only with experience-tier defaults.

**Required:**
- `tier` — total weekly session count target (`tier4plus | tier3`)
- `weeklyHours` — canonical total time budget across all disciplines
- `experienceLevel` — `true_beginner | tri_novice_but_fit | 
  intermediate | experienced`. Triathlon-specific. Distinct from 
  run-side `level` (an experienced marathoner doing first triathlon 
  is `advanced` runner + `tri_novice_but_fit` triathlete).
- `endurancePedigree` — `none | some | strong`. Captures cardiovascular 
  base regardless of triathlon history.
- `triathlonsCompleted` — count of prior triathlons (any distance).
- `goalRace` — distance and date.
- `triathlonDistance` — `sprint | olympic | 70_3 | 140_6`.

**Optional fitness inputs (per discipline):**

Swim:
- `cssSecondsPer100m` — CSS pace in seconds per 100m. Computed from 
  400m TT + 200m TT: CSS = (400 time − 200 time) / 2 per 100m. Drives 
  swim zone targets. If absent, falls back to RPE + `experienceLevel` 
  defaults.

Bike:
- `hasPowerMeter` (boolean), `ftpWatts` — FTP in watts. Drives bike 
  zones (% FTP). If absent but `hasPowerMeter` is false, falls back 
  to `lthr` (lactate threshold heart rate) for HR-based zones. If 
  both absent, RPE-only.
- `lthrBpm` — lactate threshold heart rate. Backup or primary anchor 
  for bike.

Run:
- `runThresholdSecPerKm` — run threshold pace in seconds per km. 
  Shared with running methodology. Drives run zones in triathlon 
  context. If absent, falls back to RPE + `level`-scaled defaults.
- Optional inheritance: if user has run-side `level` set, run-side 
  optional inputs (recent race times) feed into triathlon run zones.

**Fallback hierarchy when threshold values missing:**
- Numeric anchor present → use it directly
- Recent test/race result → compute anchor (Riegel for run, 20-min 
  TT × 0.95 for FTP, 400/200 TT for CSS)
- Neither → RPE-only prescription with `experienceLevel` × 
  `endurancePedigree` defaults

## Implementation hooks for plan-template.service.ts (triathlon mode)

- **Fitness inputs wired to session generation**: `experienceLevel`, 
  `endurancePedigree`, `triathlonsCompleted`, `runThresholdSecPerKm` 
  must all influence long-session duration in `getWeekSessions()`. 
  Currently `experienceLevel` is computed but not passed to session 
  generation — must be wired through.
- `mode = 'triathlon'` with `subDistance` parameter (`sprint` | `olympic` | `70_3` | `140_6`)
- `tier` parameter (`tier4plus` | `tier3`); explicit error/redirect for `tier2`
- `weeklyHours` companion input — engine targets total time budget across disciplines, not fixed session length
- `disciplineAllocation()` — distributes weekly hours across swim/bike/run by distance and phase
- `prescribeSwim()` — CSS-anchored zones, technique vs threshold vs endurance balance by phase
- `prescribeBike()` — FTP-anchored zones, sweet-spot emphasis for time-efficient stimulus
- `prescribeRun()` — inherits running methodology v4 zones and progression
- `prescribeBrick()` — three brick formats (transition, race-sim, rehearsal); frequency by phase and distance
- `prescribeStrength()` — shared with running, triathlon-specific pulling additions
- `prescribeMobility()` — shared module
- `generateRaceWeekTemplate()` — distance-calibrated taper (longer than running equivalents)
- `openWaterSwimGuard()` — flag plans without open-water sessions in final 8 weeks
- `transitionPractice()` — schedule 2–3 transition sessions in final 4 weeks
- `raceDayPlan()` — pacing + fuelling + hydration plan generated in final 2 weeks
- `adaptiveReplan` — discipline-aware missed-session logic, TSS-based ACWR
- `disciplineThresholdTests()` — CSS, FTP, run threshold scheduled every 4–6 weeks; results update zones
- New module `bricksAndRaceRehearsal` — schedules race-rehearsal weekends 4–8 weeks out for 70.3/140.6

## Sources

- Friel — *Triathlete's Training Bible* (5th ed, 2024)
- Friel — *Going Long: Training for Ironman-Distance Triathlons*
- Fitzgerald — *80/20 Triathlon*
- Dixon — *Fast-Track Triathlete* (Purple Patch methodology)
- Skiba — Critical Power and W' modelling
- Mujika & Padilla — taper meta-analyses
- Bernhardt — *Training Plans for Multisport Athletes*
- Sutton — published programmes from Trisutto coaching
- Coggan & Allen — *Training and Racing with a Power Meter*
- Maglischo — *Swimming Fastest* (CSS framework, technique)
- Jeukendrup — multisport fuelling research
- Pfitzinger & Douglas — *Advanced Marathoning* (run discipline reference)
- Daniels — *Daniels' Running Formula* (run zones)
- Blagrove et al. — strength training meta-analysis
- Berryman et al. — strength + plyometrics for endurance