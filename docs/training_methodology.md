# Training Methodology Reference (v5)

Research-backed periodisation principles for the plan-template engine.
v5 reconciles weeklyHours as canonical, defines user level inputs,
promotes RPE as a prescription channel, adds session hardness ratings,
defines adherence, and scope-cuts triathlon to v2.

Sources: Pfitzinger/Douglas, Daniels, Friel, Pierce/Murr/Moss (FIRST),
Hickson, Blagrove, Mujika, Seiler, Ingebrigtsen-method literature,
Sims, peer-reviewed studies.

## Core principle (Friel)
"The closer in time you get to the race, the more like the race your
workouts must become."

## Universal principle (promoted from earlier draft)

**Lower tiers are not failure cases.** Tier 2 produces roughly 50% of
the mortality and adaptation benefit of Tier 4+ for a fraction of the
time investment. Across all goals and tiers, the engine and UI frame
the user's chosen tier as the highest-leverage minimum that fits their
life, not as a compromise.

## Design principle for time-constrained athletes

Most plan engines optimise for a 5–7 session textbook week. For busy
adults that's a fantasy and the cause of most plan abandonment. The
harder problem is delivering meaningful adaptation at 2 or 3 running
sessions per week, with strength, mobility, and cross-training filling
the gaps. **Consistent Tier 2 beats sporadic Tier 4.**

## Inputs and their hierarchy

The engine requires the following inputs from the user. Where two
inputs could conflict, the canonical one is named explicitly.

**Required:**
- `tier` — running session count target (`tier4plus` | `tier3` | `tier2`)
- `weeklyHours` — **canonical total time budget** for structured exercise across all modalities. Volume tables below are advisory targets the engine tries to hit within this budget; if hours and km tables conflict, hours wins.
- `level` — self-reported athlete level at onboarding (`novice` | `beginner` | `intermediate` | `advanced`). Definitions:
  - **Novice**: <6 months consistent running, no race history
  - **Beginner**: 6–18 months consistent running, completed at least one race at any distance
  - **Intermediate**: 18+ months consistent running, multiple races completed, established weekly mileage
  - **Advanced**: 3+ years consistent training, race times competitive for age group, comfortable with structured intensity work
  
  Self-report is the v1 input. v2 refines from completed-session adherence patterns and race results.

- `goalRace` — distance and date if applicable
- `groupClassSlots[]` — fixed-time recurring sessions the user has externally committed to (martial arts class, dance class). Engine treats these as immovable in the schedule and accounts for their hardness rating in adjacent-day planning.

**Optional:**
- `currentRaceTimes` — recent race results for pace zone calibration
- `vO2max` or `criticalSpeed` — if known
- `restingHR`, `maxHR` — for HR-zone work

## Frequency tiers

### The tier system

| Tier | Running sessions | Cross-training | Strength | Mobility | Use case |
|------|------------------|----------------|----------|----------|----------|
| 4+ (textbook) | 4–7 | 0–2 (optional) | 2× | 1–2× | Athletes with time, performance goals |
| 3 (FIRST/Furman) | 3 | 2× | 2× | 2–3× | Busy adults, marathon-capable |
| 2 (minimum viable) | 2 | 2–3× | 3× | 3–4× | Time-poor, completion-focused |

**Tier 5+ (high-volume / pro-curious)** with doubles and 6–7 running
days is out of scope for v1. Athletes at this level typically don't use
prescriptive apps. Revisit when meaningful demand emerges.

### Preservation hierarchy — what to cut last

When forced to drop sessions, the order to preserve is:
**long run > LT2/threshold quality > marathon-pace/tempo > VO2max > easy filler.**

A 3-session week that keeps long run + threshold + MP retains roughly
80–85% of the adaptation a 5-session polarised week delivers per
Pierce/Murr/Moss FIRST data. **Caveats**: FIRST samples were small,
self-selected, and nearly all participants had established aerobic
bases (years of running) before voluntarily reducing volume. Pure
beginners following Tier 3 from day one do not produce equivalent
outcomes. The hierarchy still applies, but absolute performance ceilings
at Tier 3/2 are realistically below Tier 4+ for the same athlete.

A 3-session week that drops the long run is junk regardless of
training history.

### Tier 3 programme — FIRST/Furman model

- **Day 1**: quality day, rotates weekly across LT2 intervals / VO2max / hill reps
- **Day 2**: tempo or marathon-pace continuous run (25–60 min depending on race distance)
- **Day 3**: long run, with race-pace segment in build/peak phase
- 2× cross-training (bike most common, row or swim alternative)
- 2× strength (heavy + plyometric)
- 2–3× mobility (10–20 min sessions, can pair with strength)
- 1 full rest day

Each running session does double duty. FIRST itself is silent on
cross-training intensity; the practical case for keeping cross-training
aerobic at this tier is that quality on running days is already 
intense, and stacking hard cross-training compounds load.

### Tier 2 programme — minimum viable

- **Day 1**: combined quality session (e.g., 2 km easy + 4×1 km @ LT2 + 1 km easy, or progression run from MP to LT2)
- **Day 2**: long run with race-pace finish (last 25–30% at goal pace from build phase onwards)
- 2–3× cross-training (longer aerobic blocks become the primary volume source)
- 3× strength + mobility combined sessions (40–50 min each)
- Rest as needed

Tier 2 sacrifices peak performance ceiling but preserves the ability to
train consistently. Realistic targets at this tier: race completion,
modest PRs, general fitness. Not BQ-chasing.

### What does not work at Tier 2
- Marathon training with aggressive time goals (sub-3 etc.) — completion-focused only
- Norwegian sub-threshold method (requires double-day frequency)
- Triathlon training (volume requirements don't fit)

## RPE as a first-class prescription channel

Most amateur runners lack lactate meters; HR straps are noisy
(especially on cold mornings, with chest-strap drift, or for users on
beta-blockers / SSRIs). RPE-anchored prescription is a first-class
fallback for running, not just for cross-training conversions.

**RPE 1–10 scale anchored to zones:**
- RPE 1–2: barely moving, recovery walk
- RPE 3–4: easy, conversational, full sentences (Z1–Z2)
- RPE 5–6: aerobic threshold / marathon pace, conversational in short phrases (Z3 / LT1)
- RPE 7–8: lactate threshold, comfortably hard, single words (Z4 / LT2)
- RPE 9: VO2max, very hard, sentence broken (Z5)
- RPE 10: max effort, unsustainable beyond seconds

Engine prescribes both pace and RPE for every session. Athletes can
ignore pace and run by RPE on bad days — quality stimulus is preserved.

## Session hardness rating

Every prescribed session has a hardness rating 1–5. The engine uses
this to enforce hard-easy alternation across modalities:

| Rating | Examples |
|--------|----------|
| 1 — Recovery | Z1 walk, gentle yoga, mobility |
| 2 — Easy | Easy run, Z2 cycling, restorative yoga |
| 3 — Moderate | Marathon-pace tempo, vinyasa yoga, Pilates, light strength |
| 4 — Hard | LT2 intervals, tempo runs at HM pace, heavy strength, bouldering session |
| 5 — Very hard | VO2max intervals, race simulations, max-effort strength, plyometrics |

**Hard-easy rule:** no two consecutive days of rating ≥4. After a
rating-5 day, the next day must be rating ≤2.

Group/class slots provided by the user are scored against this scale
(default rating 3 if unknown — engine prompts user to confirm).

## Adherence — defined signal

`adherence` is computed from completed sessions over the trailing 4
weeks:

- **Completion rate**: % of prescribed sessions actually completed
- **RPE delta**: average difference between prescribed RPE and reported RPE (positive = sessions felt harder than intended)
- **Streak**: consecutive days with ≥1 completed prescribed session
- **Skip pattern**: distribution of skipped sessions across the week (random misses are different from systematically skipping the same day)

Adaptive replanning consumes these as a vector, not as a single score.
A user with 70% completion + RPE delta +1.5 + concentrated skips is in
a different state from 70% completion + RPE delta 0 + scattered skips.
The first signals overreaching; the second signals scheduling friction.

## The five training zones (modern split)

| Zone | Label | Pace anchor | RPE | Lactate (mmol/L) | Adaptation target |
|------|-------|-------------|-----|------------------|-------------------|
| Z1 | Recovery | very easy, conversational | 1–2 | <1.5 | parasympathetic recovery, capillarisation |
| Z2 | Aerobic / easy | conversational, 60–75% HRmax | 3–4 | 1.5–2.0 | mitochondrial density, fat oxidation |
| Z3 | Aerobic threshold (LT1) | marathon pace for amateurs | 5–6 | ~2.0 | lactate clearance, marathon-specific endurance |
| Z4 | Lactate threshold (LT2 / MLSS) | ~1-hour race pace ≈ half marathon pace for most amateurs | 7–8 | ~4.0 | sustainable high-power output |
| Z5 | VO2max | 3K–5K race pace, 95–100% HRmax | 9 | >6.0 | oxygen uptake ceiling |

**Critical Speed / Critical Power** is a parallel framework worth
supporting as an option for power-meter / GPS-watch users.

## Polarised vs Norwegian — pick by athlete level and tier

**Polarised / 80-20 (Seiler)** — default for Tier 4+ beginner and
intermediate. 80% Z1–Z2, 20% Z4–Z5, almost nothing in Z3.

**Norwegian sub-threshold (Ingebrigtsen)** — Tier 4+ advanced only,
gated. Selecting it requires:
- Minimum 12 months of consistent structured training history
- Athlete confirms double-day capacity (running 6+ days/week)
- Explicit warning gate explaining the demands

The Norwegian gate **re-confirms after any layoff longer than 6 weeks**.
Returning athletes default back to polarised until they re-confirm
Norwegian readiness.

If any gate fails at any time, suggest polarised as the default and
note that Norwegian can be revisited after 6+ months of consistent
Tier 4+ polarised training.

**Tier 3 and Tier 2 are inherently non-polarised** — there isn't enough
volume to dilute hard work to 20%. These tiers run closer to a 50-50
distribution by design, which is sustainable specifically because total
volume is low.

## Weekly volume by race distance (advisory targets)

These tables are advisory. **`weeklyHours` is the canonical input** —
the engine targets total hours within the budget and the km values
below are derived as guidance.

### Tier 4+ (textbook)

| Race | Novice (km) | Beginner (km) | Intermediate (km) | Advanced (km) |
|------|------------|---------------|-------------------|---------------|
| 5K | 15–25 | 30–40 | 50–65 | 70–90 |
| 10K | 20–30 | 35–50 | 55–75 | 80–100 |
| Half marathon | 25–35 | 40–55 | 55–75 | 70–100 |
| Marathon | 35–50 | 50–70 | 70–95 | 95–130+ |

### Tier 3 and Tier 2 (running km only — cross-training adds on top)

| Race | Tier 3 running (km/week) | Tier 2 running (km/week) | Cross-training (h/week) |
|------|--------------------------|--------------------------|-------------------------|
| 5K | 25–40 | 15–25 | 1.5–3 |
| 10K | 30–50 | 20–35 | 2–3.5 |
| Half marathon | 35–55 | 25–40 | 2.5–4 |
| Marathon | 40–70 | 30–50 (completion-only — below FIRST baseline) | 3–5 |

Total training stress at Tier 3 with cross-training approaches Tier 4+
intermediate; Tier 2 with cross-training sits between novice and
beginner equivalent stress, with much better injury durability per km
run.

**Tier 2 marathon explicit caveat:** below the FIRST 40-km baseline.
Engine prescribes this only with a "completion target" framing, not a
time goal. Users selecting time goals at Tier 2 marathon are nudged to
Tier 3.

## Long run progression

| Race | Long run starts | Long run peaks | Notes |
|------|----------------|----------------|-------|
| 5K | 8–10 km | 14–16 km | ~1.5x race distance |
| 10K | 10–12 km | 16–20 km | ~1.5–2x race distance |
| Half marathon | 10–12 km | 18–22 km | around or slightly over race distance |
| Marathon | 14–18 km | **30–32 km** | Pfitzinger cap; longer runs raise injury risk without proportional fitness gain |

**Long run as % of weekly volume:**
- Tier 4+: ≤25–30% of running volume (Pfitzinger)
- Tier 3: ≤35% of running volume
- Tier 2: ≤45% of running volume, **but capped against running + cross-training equivalent volume** at ≤30%

The denominator change at Tier 2 matters — without cross-training in
the equation, the cap blocks long runs that are perfectly safe given
the athlete's actual aerobic conditioning.

## Race distance training emphasis

### Tier 4+

**5K:** VO2max primary, LT2 secondary, endurance third
- 2 quality sessions/week
- True VO2max sessions: 5×1000m @ 3K–5K pace, 6–8×800m @ 3K–5K pace, 4×1200m @ 5K pace; **recovery jog duration = 100% to 200% of work interval duration** (i.e., 1:1 to 2:1 work-to-rest with rest as the longer side)
- 4×1600m @ 10K pace is **cruise-interval / threshold work** (Z4), not VO2max

**10K:** VO2max and LT2 equally important — 1 VO2max + 1 tempo + 1 long run weekly

**Half marathon:** LT2 primary, endurance secondary — 2 LT2/week feasible in final 6 weeks, VO2max maintenance only in last 4 weeks

**Marathon:** endurance primary, LT1 secondary, LT2 tertiary — Pfitz medium-long mid-week run 16–20 km, MP segments inside long runs

### Tier 3 race emphasis (rotation pattern)

Quality day rotates across a 3-week microcycle. Example for half marathon:

| Week | Quality day | Tempo/MP day | Long run |
|------|------------|--------------|----------|
| 1 | LT2 (e.g. 4×1600m @ HM pace) | 30 min tempo | 16 km easy |
| 2 | VO2max (e.g. 6×800m @ 5K pace) | 25 min tempo | 18 km with 5 km @ HM pace finish |
| 3 | Hills (e.g. 8×60s hard up) | 35 min @ MP | 14 km recovery long |

Cycle repeats with progressive overload across mesocycle. Each race
distance shifts the rotation balance — marathon spends more weeks on
MP, 5K spends more on VO2max.

### Tier 2 race emphasis (combined sessions)

Quality day combines LT2 + brief VO2max touch to retain both stimuli in
one session. Example for 10K training:
- 2 km easy → 3×1 km @ LT2 → 4×400m @ 5K pace → 1 km easy

Long run handles endurance + race-pace work. Marathon Tier 2 long run
might be: 25 km total with last 8 km at MP.

## Form and technique

For novice and beginner runners, form work is the highest-leverage
performance lever — often more impactful than additional volume. Add
to all running plans:

**Cadence drills** — target 170–185 steps/min for most runners. Prescribe
strides at high cadence; metronome optional.

**Posture cues** — tall through the spine, slight forward lean from
ankles (not hips), relaxed shoulders, arms swinging front-to-back not
across the body.

**Foot strike** — let it sort itself out from cadence and posture.
Forcing forefoot strike on a heel striker causes calf and Achilles
issues. Increase cadence first; foot strike follows.

**Drills** — A-skips, B-skips, butt kicks, high knees. 5–10 min weekly
during warm-up. Most useful for novice/beginner; maintenance only
for intermediate/advanced.

**Hill sprints** — 6–8×10s @ near-max effort uphill, full recovery
between. 1×/week through base phase, all tiers. Builds neuromuscular
power and economy with negligible recovery cost.

## Periodisation phases

**Base** (4–8 weeks): aerobic endurance, neuromuscular development
- Strides 2×/week year-round, all tiers
- Hill sprints weekly through base
- Heavy strength training (frequency by tier)
- Tempo minimal at Tier 4+; at Tier 3/2 still present

**Build** (4–8 weeks): race-specific, LT2 + VO2max
- 2 quality sessions/week at Tier 4+; rotation pattern at Tier 3; combined session at Tier 2
- Long run grows
- Strength maintained (do not drop)

**Peak** (1–3 weeks): race simulation
- Race-pace efforts dominant
- Volume slightly reduced
- Strength reduced to 1×/week, light

**Taper** (Mujika-calibrated by distance):
- Marathon: 14–21 days, volume −40 to −60%, intensity maintained
- Half marathon: 7–14 days, volume −30 to −50%
- 10K: 7–10 days, volume −30 to −40%
- 5K: 5–7 days, volume −20 to −40%
- Frequency maintained — do not reduce session count
- Strides every 2–3 days through race week

At Tier 3 and Tier 2, taper volume cuts apply to cross-training as well
as running. Strength drops to 1× light session in race week.

## Strength training

**Evidence base:**
- **Heavy resistance training** (≥80% 1RM, low reps 3–6) improves running economy 2–8%
- **Plyometrics** (jump training) adds further economy gains, particularly for shorter distances
- Minimum effective programme: ≥8 weeks before benefits show
- Full detraining loses adaptation in 4–6 weeks

**Frequency by tier:**
- Tier 4+: 2× heavy + plyo through base/build, 1×/week peak/taper
- Tier 3: 2× heavy + plyo year-round (lives on off-running days)
- Tier 2: 3× combined strength + mobility (40–50 min sessions). Strength is doing double duty here as injury-prevention scaffold and as additional metabolic load.

**Programme priorities for runners (all tiers):**
- Posterior chain (deadlifts, hip thrusts, single-leg RDL)
- Single-leg work (Bulgarian split squats, step-ups)
- Plyometrics (pogo hops, bounds, depth jumps)
- Core anti-rotation (Pallof press, suitcase carries)
- Avoid: high-rep low-load circuits sold as "runner's strength"

## Mobility

**Dynamic warm-up (5–10 min before runs):** leg swings, walking lunges,
A-skips, B-skips, ankle circles.

**Post-run mobility (5–10 min):** hip flexor, calf, glutes, thoracic.

**Standalone sessions:** yoga, foam rolling, hip-focused mobility.

**Frequency by tier:**
- Tier 4+: 1–2× standalone weekly + dynamic warm-ups
- Tier 3: 2–3× standalone
- Tier 2: 3–4× sessions, often paired with strength

## Cross-training

At Tier 4+ cross-training is optional injury insurance. At Tier 3 and
Tier 2 it's a load-bearing pillar.

### Modalities ranked by running transfer

Conversion ratios are RPE-anchored at **matched-Z2 effort** — i.e., the
modality is performed at the same conversational intensity as easy
running. At higher intensities the ratios shift and cycling/swimming
require longer durations to match running stimulus. Mainstream coaching
norms cite 1:2–3 for cycling at unmatched effort; these tighter ratios
assume the disciplined Z2 case.

| Modality | Running transfer | Best use | Time conversion (Z2 matched-RPE) |
|----------|-----------------|----------|----------------------------------|
| Elliptical (running motion) | Highest | Direct run substitute when injured | 1:1 by time |
| Cycling | High aerobic, lower neuromuscular | Aerobic volume, leg strength | 1:1.5–2 by time |
| Rowing | High aerobic, full body | Strength-cardio hybrid | 1:1.5–2 by time |
| Stair climber / incline walk | Moderate-high | Strength-endurance, low impact | 1:1.2–1.5 by time |
| Swimming | High aerobic, low gait transfer | Recovery, deload | 1:1.5–2 by time |

### When to substitute vs supplement

- **Substitute** (replace a run): injured, deload week, impact accumulation high
- **Supplement** (add aerobic on top): build aerobic volume without injury risk
- **Brick**: Tier 3 weeks can use bike-then-run brick to compress two stimuli into one window

### One rule

If it raises heart rate to easy zone for 30+ minutes and the athlete
will do it consistently, it counts. Modality choice matters less than
adherence.

## Strides

Year-round, all tiers. 8–12× 15–20s @ ~mile pace, full recovery.
Negligible recovery cost. Keep 2×/week through base/build/peak; 1×
every 2–3 days through taper.

## Triathlon — scope-cut to v2

Triathlon support is acknowledged but not shipped in v1. Methodology
research is preserved below for v2 build:

**Sprint** (750m / 20km / 5km) — 8–12 weeks plan, 6–10 h/week peak, 1 brick/week
**Olympic** (1.5km / 40km / 10km) — 12–16 weeks plan, 8–12 h/week peak, 1–2 bricks/week
**Half Ironman / 70.3** (1.9km / 90km / 21km) — 16–24 weeks plan, 10–15 h/week peak, reverse periodisation, weekly bricks
**Ironman / 140.6** (3.8km / 180km / 42km) — 24–30 weeks plan, 12–20 h/week peak, race-rehearsal weekends in build

V1 users selecting triathlon are routed to a "coming soon" message
with optional waitlist signup.

## Modifier signals (cluster)

These modify session prescription on a 24–72h timescale. Engine pulls
from connected apps (sleep, diet) and direct user input:

- **Alcohol intake** (yesterday): expect impaired strength recovery, reduced sleep quality. Soften next-day intensity by 10–20% RPE; do not skip prescribed quality
- **Illness** (current): pause structured training during fever or symptoms below the neck; resume with Z1–Z2 only for 3–5 days
- **Jet lag** (current): reduce intensity for 1 day per timezone crossed; long-haul east is harder than west
- **Shift work / night shift** (current): treat the post-shift period like jet lag; key sessions placed only on rested days
- **Poor sleep** (<6h, recent): drop a planned hard session to easy or recovery; do not stack sleep debt
- **High life stress flagged**: weight rest, mobility, and gentle yoga sessions higher; de-emphasise high-RPE work for the affected week

## Adaptive replanning

Static PDF plans are a solved problem. Adaptive replanning is the
differentiator.

**Missed session logic — sensitivity scales with tier:**
- Tier 4+ missed easy run: drop, do not make up
- Tier 4+ missed quality: shift to next available slot
- **Tier 3 missed any session**: 33% of week's stimulus lost. Restructure remaining week, do not stack.
- **Tier 2 missed any session**: 50% of week's stimulus lost. Substitute with cross-training at minimum.
- Missed long run any tier: do not stack with next week's; cap any single-week volume jump at 15%
- Missed >2 consecutive days: rebuild the week, reduce intensity

**Adherence-driven adjustments** (using the defined adherence vector):
- Completion ≥90% + RPE delta near zero + stable streak: progress on schedule
- Completion 70–90% + RPE delta +1 to +2: hold volume, do not progress until RPE delta closes
- Completion <70% OR RPE delta >+2 sustained: drop volume by one tier-step (e.g., upper end of Tier 3 → lower end of Tier 3, or Tier 3 → Tier 2 sustained)
- Concentrated skip pattern (same day repeatedly): suggest schedule restructure, do not penalise volume

**Pace updates from completed sessions**
- vVO2max regression from recent quality sessions
- Race results feed pace update directly (Riegel formula or Cameron variant)
- Smooth updates — no whiplash from one session

**Acute:chronic workload ratio (ACWR)**
- Soft flag, not auto-cut, when 7-day load >1.5× 28-day average
- Combine with subjective wellness — single signal is noisy

**Race-week and post-race**
- Auto-generate taper from race date
- Post-race recovery: easy days = race distance in km / 2, no quality for ~10 days after marathon, ~5 days after half

## Universal rules

- **10% rule**: soft guideline, not a hard cap. Buist 2008 RCT found no injury difference vs faster progression in novice runners, but the underlying principle of gradual progression remains valid. Use as a sanity check that surfaces a warning, not as an automated block.
- **Long run cap**: tier-aware (see long run section).
- **Hard-easy alternation**: enforced via session hardness rating. No two consecutive days rating ≥4.
- **Recovery week every 4th**: volume −20 to −30%, intensity maintained.
- **Tune-up race timing**: marathon 3–5 weeks out, half 2–3 weeks out, 10K 1–2 weeks out.
- **Strides year-round**, all tiers.
- **Strength year-round** at varying frequency, never zeroed.
- **Sleep > supplements**.

## Implementation hooks for plan-template.service.ts rewrite

- Inputs: `tier`, `weeklyHours` (canonical), `level`, `goalRace`, `groupClassSlots[]`
- `calculateLongRunProgression()` — marathon cap 32 km, tier-aware % cap
- `calculateSpeedWorkProgression()` — split LT2 and VO2max buckets; rotation logic at Tier 3; combined-session at Tier 2
- `getPaceZones()` — five zones with LT1/LT2 split; CS option
- `getRPEPrescription()` — first-class output alongside pace
- `getSessionHardnessRating()` — 1–5 score on every session
- `enforceHardEasyAlternation()` — uses hardness rating
- `respectGroupClassSlots()` — fixed-time immovables, scored against hardness rating
- `generateRaceWeekTemplate()` — Mujika-calibrated taper across modalities
- `prescribeStrength()` — tier-aware, never zeroed, programme priorities
- `prescribeMobility()` — tier-aware
- `prescribeCrossTraining()` — modality preferences, time conversions, Z2-matched caveat
- `applyStrides()` and `applyHillSprints()` — year-round
- `applyFormDrills()` — novice/beginner emphasis
- `computeAdherenceVector()` — completion + RPE delta + streak + skip pattern
- `applyModifierSignals()` — alcohol, illness, jet lag, shift work, poor sleep, stress
- `gateNorwegianMethod()` — initial gate + 6-week layoff re-confirmation
- New mode `paceFromRaceResult` — Riegel/Cameron projection
- Triathlon: route to "coming v2" with waitlist

## Sources

- Pfitzinger & Douglas — *Advanced Marathoning* (3rd ed)
- Daniels — *Daniels' Running Formula* (4th ed, 2022)
- Friel — *Triathlete's Training Bible* (5th ed, 2024)
- Pierce, Murr & Moss — *Run Less, Run Faster* (FIRST programme)
- Hickson — minimum-frequency CV maintenance research (1981, 1985)
- Seiler — polarised training research
- Casado et al. — Norwegian sub-threshold method analyses
- Blagrove et al. — *Effects of Strength Training on Distance Running Performance* (2018)
- Berryman et al. — strength + plyometrics for endurance economy (2018)
- Mujika & Padilla — taper meta-analyses
- Buist et al. — 10% rule RCT (2008)
- Gabbett — acute:chronic workload ratio (2016)
- Jones & Vanhatalo — Critical Power / Critical Speed framework
- Sims — *ROAR* and *Next Level*
- McMillan — *YOU (Only Faster)*
- Hudson — *Run Faster from the 5K to the Marathon*
