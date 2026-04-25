# Wellness Methodology Reference (v3)

Research-backed programming principles for the plan-template engine's
non-race goals: **weight loss** and **general health**. Companion
document to training_methodology.md (race-prep). v3 reconciles
weeklyHours, defines user level, promotes RPE, adds session hardness
ratings, defines adherence, handles group-class slots, treats "Other"
activity, promotes the universal "minimum is not failure" framing.

Diet and calorie tracking are handled by the integrated calorie
counting app and are not in scope here.

Sources: WHO Physical Activity Guidelines, ACSM, Attia, San Millan,
Helms/Norton, Phillips, Levine (NEAT research), Paluch (steps and
mortality), Helgerud (Norwegian 4×4), peer-reviewed studies.

## Core principles

- **Diet drives weight loss (70–80%).** Exercise alone is a poor weight-loss tool. Programming must support diet adherence, not substitute for it.
- **Strength training is non-negotiable in a deficit.** Without intervention, ~25% of weight lost is lean mass. With the protein + heavy lifting protocol prescribed below, that drops to ~5–15%.
- **VO2max is among the strongest predictors of all-cause mortality.** Cardio prescription for general health centres on aerobic capacity development, not calorie burn.
- **NEAT > discrete cardio for total daily energy expenditure.** Daily steps and movement matter more than the gym session.
- **Adherence beats optimisation.** A user-preferred activity done consistently outperforms an optimal one done sporadically.

## Universal principle (shared with race-prep)

**Lower tiers are not failure cases.** Tier 2 produces roughly 50% of
the mortality and adaptation benefit of Tier 4+ for a fraction of the
time investment. Across all goals and tiers, the engine and UI frame
the user's chosen tier as the highest-leverage minimum that fits their
life, not as a compromise.

## Inputs

The wellness branch shares the canonical inputs from training-prep:

**Required:**
- `goal` — `weight_loss` | `general_health` (extensible later)
- `tier` — total weekly session count target
- `weeklyHours` — **canonical** total time budget
- `level` — self-reported activity level (`sedentary` | `lightly_active` | `moderately_active` | `very_active`). Definitions:
  - **Sedentary**: <2,000 steps/day baseline, no structured exercise
  - **Lightly active**: 2,000–5,000 steps/day, occasional exercise
  - **Moderately active**: 5,000–8,000 steps/day, regular structured exercise
  - **Very active**: 8,000+ steps/day, multiple structured sessions weekly
- `activities[]` — selected from the picker; mapped via coverage matrix
- `groupClassSlots[]` — fixed-time recurring sessions

**Optional:**
- `dietAppFlags` — protein adherence, deficit depth, hunger/satiety, stress signals
- `wearableFlags` — sleep quality, HRV, alcohol intake (if tracked)

## The four pillars

| Pillar | Purpose | Weight loss role | General health role |
|--------|---------|------------------|---------------------|
| Cardio | Aerobic capacity, heart health, metabolic flexibility | Adherence-friendly modality, supports deficit | Primary longevity driver via VO2max |
| Strength | Lean mass, sarcopenia prevention, metabolic rate | Preserves muscle in deficit — critical | Prevents age-related decline; primary lever 40+ |
| Mobility | Joint health, injury prevention, age-resilience | Supports adherence by preventing breakdown | Quality-of-life pillar; compounds with age |
| NEAT | Total daily energy expenditure, glucose control | Highest-leverage non-diet lever for weight | Independent mortality reduction beyond structured exercise |

## Activity coverage matrix

User picks preferred activities. Engine maps coverage to pillars and
fills gaps with supplementary sessions.

| Activity | Cardio | Strength | Mobility | NEAT contribution | Hardness rating | Notes |
|----------|--------|----------|----------|-------------------|-----------------|-------|
| Running | High | Low | Low | Med | 3–5 by intensity | High impact; cardio dominant |
| Cycling | High | Low–Med | Low | Med | 2–4 by intensity | Low impact; great for high volume |
| Swimming | High | Med | Med | Low | 2–4 by intensity | Zero impact; full body |
| Strength Training | Low | High | Low–Med | Low | 4 (heavy), 3 (moderate) | Pillar 2 anchor |
| Yoga (gentle/restorative) | Low | Low | High | Low | 1–2 | Stress reduction primary |
| Yoga (power/vinyasa) | Low–Med | Med | High | Low | 3 | Modest strength |
| Pilates (mat) | Low | Med | High | Low | 2–3 | Core-dominant |
| Pilates (reformer) | Low | Med–High | High | Low | 3 | Highest strength yield in this category |
| Bouldering | Med | High (grip/upper) | High | Low | 3–4 | Skill-based; upper-body biased |
| Boxing | High | Med | Med | Low | 4 | High burn; mental health bonus |
| Martial Arts (striking) | Med–High | Med | Med | Low | 3–4 | Muay Thai, karate kata |
| Martial Arts (grappling) | Low–Med | Med–High | Med | Low | 3–4 | BJJ, judo, wrestling |
| Dance | Med–High | Low–Med | Med–High | Med | 2–4 by style | Style-dependent |
| Hiking | Med | Low | Low | High | 2–3 | NEAT + cardio combination |
| **Other** | Med (default) | Med (default) | Med (default) | Med (default) | 3 (default) | User-supplied. Engine treats as low-confidence supplementary modality. Prompt user to confirm pillar coverage manually if Other is the only pick |

If the activity selector cannot support the granular Yoga/Pilates and
Martial Arts splits, fall back to single entries with the median rating.

**Coverage rule**: balanced programme needs at least Med-coverage in
each pillar — across user picks plus engine-added supplementary sessions.

**Group class slots**: when activities are practised at fixed times
(martial arts class Tuesdays 19:00, dance class Saturdays 11:00),
they're treated as immovable in the schedule and contribute their
hardness rating to adjacent-day planning.

## Frequency tiers (matched to race-prep)

| Tier | Total weekly sessions | Use case |
|------|----------------------|----------|
| 4+ | 4–7 sessions | Engaged users with time |
| 3 | 3 sessions | Default for time-constrained adults |
| 2 | 2 sessions | Minimum viable; baseline health goal |

NEAT (steps) is daily and runs in parallel to all tiers — counted as a
separate pillar, not a session.

## Weight loss programme

**Anchor: 3× strength minimum at Tier 4+ and Tier 3, 2× at Tier 2.**
Strength is the load-bearing pillar in a deficit because it preserves
lean mass with the protein protocol. Cardio is supportive, not central.

### Tier 4+ weight loss
- 3× strength (heavy compounds, full body or upper/lower split)
- 1–2× cardio (any preferred modality, 30–45 min Z2 dominant)
- 1× mobility (standalone or paired with strength cool-down)
- Daily NEAT target: 10–12k steps (target, not week-1 prescription — see ramp below)

### Tier 3 weight loss
- 3× strength sessions, each with 15–20 min cardio finisher
- Daily NEAT target: 12k+ steps
- Mobility integrated into warm-ups and cool-downs

### Tier 2 weight loss
- 2× full-body strength (45–60 min, compound focus)
- Daily NEAT target: 12k+ steps as primary lever
- 1× short mobility (15 min, paired with strength)
- This tier leans most on diet and steps

### Step ramp (universal)

NEAT targets above are **targets, not week-1 prescriptions**. A
sedentary user starting at 3,000 steps/day is ramped by ~1,000 steps/week
until target hit. Engine surfaces this clearly so users don't feel they're
failing on day one.

### Weight loss specifics

- **HIIT in deficit**: HIIT-dominant programmes have lower adherence on average due to high RPE and recovery cost. **Respect user preference if HIIT is their picked activity** — pair with strength to preserve lean mass and watch for adherence/recovery signals.
- **Don't chase calorie-burn cardio.** Long sessions raise appetite disproportionately to spend.
- **Walking after meals** improves post-prandial glucose response. 10 minutes is enough.
- **Strength session order**: compounds first (squat, deadlift, press, row, pull) — ~70% of session time on compounds.
- **Protein intake** (calorie app domain) drives strength outcomes more than session design at this level.
- **Stress and sleep**: chronic stress drives appetite and resists fat loss. When modifier signals fire (poor sleep, low HRV, subjective stress, alcohol), engine weights rest, mobility, and gentle yoga higher for the affected window.

## General health programme

**Floor: WHO/ACSM minimums.** 150 min moderate OR 75 min vigorous
aerobic + 2× strength + balance/flexibility 2×/week.

**Ceiling: dose-response is roughly linear up to ~300 min/week** with
diminishing but still-positive returns beyond.

### Tier 4+ general health
- 2× strength
- 1× Z2 cardio (45–60 min, conversational pace)
- 1× VO2max session (Norwegian 4×4 default: 4×4 min @ 90–95% HRmax, 3 min recovery)
- 1–2× mobility
- Daily steps: 8–10k

### Tier 3 general health
- 2× strength
- 1× cardio (mixed-intensity 45 min)
- Mobility integrated into warm-ups and cool-downs
- Daily steps: 8–10k

### Tier 2 general health
- 1× full-body strength (45–60 min)
- 1× cardio (45 min mixed intensity)
- Daily steps: 9k+ as primary pillar

### General health specifics

- **VO2max is the single highest-leverage longevity metric controllable through training.** Norwegian 4×4 default; SIT alternative for time-pressed users.
- **Zone 2**: conversational pace, 60–70% HRmax, 45–60 min sessions.
- **Strength prescription**: heavy compounds at the centre.
- **Balance and single-leg work** matter increasingly with age. Five minutes per session pays compounding dividends past 50.
- **Step floors are age-stratified** (Paluch 2022): mortality benefit plateaus at 6,000–8,000 steps for adults 60+, and at 8,000–10,000 for adults under 60. The engine adjusts step targets accordingly.

## RPE and session hardness

Same scales as the race-prep doc. Every prescribed session has both an
RPE band and a hardness rating 1–5. Hard-easy alternation enforced
across modalities — heavy strength day not stacked next to long cardio
day, heavy bouldering session not stacked next to leg-day strength.

Group/class slots provided by the user are scored against the hardness
scale (engine prompts user to confirm rating if unknown).

## Adherence (defined signal)

Same definition as race-prep:
- **Completion rate** over trailing 4 weeks
- **RPE delta** average
- **Streak**
- **Skip pattern** distribution

Adaptive replanning consumes these as a vector, not a single score.

## Activity selection — covering gaps

The engine's job: take user picks, map coverage, supplement gaps.
**Never override a user pick.**

### Example flows

**Picks: Strength Training only**
- Coverage: Strength high, others low
- Fill: 1–2× cardio added (engine defaults to walking or hiking when user has no cardio picks)
- Mobility: integrated into strength warm-ups + 1 standalone session

**Picks: Yoga/Pilates, Bouldering**
- Coverage: Mobility high, Strength med-high (upper-body weighted), Cardio low
- Fill: 1–2× cardio added; 1× lower-body-focused strength

**Picks: Running, Strength Training, Yoga/Pilates**
- Coverage: balanced
- No fill needed
- Engine schedules to respect hard-easy alternation

**Picks: Boxing/Martial Arts, Dance**
- Coverage: Cardio high, mobility med, strength low
- Fill: 2× strength added
- Mobility: 1 standalone session added

**Picks: Hiking, Bouldering**
- Coverage: NEAT high, mobility high, strength med, cardio med
- Fill: 1× structured cardio (Z2 — engine offers cycling or swimming)

**Picks: Other (only)**
- Engine acknowledges low confidence
- Prompts user to confirm what pillars the activity covers
- Defaults to fill all four pillars with supplementary sessions until clarified

### Engine principle

Supplement, never substitute. If the user did not pick running, do not
prescribe running. The supplementary defaults — walking, hiking,
cycling, basic strength — are chosen for lowest-friction additions.

## Injury return (v1 default)

When a user reports an injury or pain flag, the engine applies a
2-week conservative protocol before reassessment:

- **Pause progression** — no load or volume increases for 2 weeks
- **Swap impact-heavy sessions** for low-impact equivalents:
  - Running → swimming, cycling, elliptical, or walking
  - Plyometrics → bodyweight resistance, isometric holds
  - Heavy compound lifts → reduced-load equivalents (60% working weight) or unilateral substitutes that avoid the injured pattern
- **Strength load reduction** to 60% of working weight, RPE-anchored
- **Maintain frequency** — do not reduce session count
- **Mobility increased** by 1 session/week
- **Reassess at 2 weeks**: if symptom-free during sessions, gradual return to full programming over 2–3 weeks. If symptoms persist, surface a recommendation to consult a physiotherapist and continue conservative protocol.

## Modifier signals (cluster — shared with race-prep)

Engine pulls from connected apps and direct user input:

- **Alcohol intake** (yesterday): expect impaired strength recovery, reduced sleep quality. Soften next-day intensity by 10–20% RPE
- **Illness** (current): pause structured training during fever or symptoms below the neck; resume Z1–Z2 only for 3–5 days
- **Jet lag** (current): reduce intensity for 1 day per timezone crossed
- **Shift work / night shift** (current): treat the post-shift period like jet lag
- **Poor sleep** (<6h, recent): drop a planned hard session to easy or recovery
- **High life stress flagged**: weight rest, mobility, and gentle yoga sessions higher

## Universal rules

- **Hard-easy alternation across modalities**: enforced via session hardness rating
- **48 hours between same-muscle-group strength sessions**
- **Sleep is a pillar of its own** — surfaced in adaptive feedback, not session design
- **Stress management** matters disproportionately for weight loss outcomes
- **Deload week every 4–6 weeks**: −20–30% volume, intensity maintained
- **Walking is exercise.** For weight loss demographic especially, it's the primary lever.

## Adaptive replanning (wellness branch)

- **Missed strength session**: do not double up. Shift week, reduce volume on adjacent days.
- **Missed cardio**: easy to make up with steps or shorter replacement
- **Missed mobility**: drop, no make-up
- **Strength load progression**: +2.5–5% when prescribed reps hit cleanly for 2 consecutive sessions; back off on RPE >9 or form breakdown
- **Step targets adapt to baseline**: ramp by ~1k/week until target hit
- **Plateau detection (weight loss)**: if scale stalls 2+ weeks at maintained adherence, signal the diet app for recalibration. **Default response is not "add more cardio."**
- **Adherence-driven adjustments**: same vector logic as race-prep
- **Modifier signals**: applied per cluster

## Implementation hooks for plan-template.service.ts (wellness branch)

- Inputs shared with race-prep: `tier`, `weeklyHours` (canonical), `level`, `groupClassSlots[]`
- Wellness-specific: `goal`, `activities[]`
- `coverageMap()` — given activities[], returns per-pillar coverage scores; flags gaps
- `fillGaps()` — adds supplementary sessions when pillar coverage below threshold
- `prescribeStrength()` — shared module with race-prep, tier-aware, compound-prioritised
- `prescribeCardio()` — modality drawn from user picks; intensity tier- and goal-aware
- `prescribeMobility()` — shared module
- `prescribeNEAT()` — daily step target by tier, goal, and age band; baseline-aware ramp
- `vo2maxProtocol()` — Norwegian 4×4 default; SIT alternative; modality-flexible
- `walkingAsCardio` — first-class session type
- `injuryReturnProtocol()` — 2-week conservative default with reassessment
- `respectGroupClassSlots()` — fixed-time immovables, hardness-rated
- `applyModifierSignals()` — shared with race-prep
- `dietAppIntegration` — receives weight trend, adherence, hunger/satiety, stress signals
- `plateauDetection` — 2+ weeks stalled scale triggers diet-app handoff, not cardio escalation
- `computeAdherenceVector()` — shared with race-prep
- `handleOtherActivity()` — low-confidence supplementary, prompts user to clarify pillar coverage

## Sources

- WHO — *Guidelines on Physical Activity and Sedentary Behaviour* (2020)
- ACSM — *Guidelines for Exercise Testing and Prescription* (11th ed)
- Attia — *Outlive*
- San Millan & Brooks — Zone 2 metabolic flexibility research
- Helms, Aragon, Fitschen — *The Muscle and Strength Pyramid*
- Phillips et al. — protein intake and resistance training for lean mass
- Levine et al. — NEAT research
- Paluch et al. — *Steps per day and all-cause mortality* (2022)
- Helgerud et al. — Norwegian 4×4 VO2max protocol
- HERITAGE Family Study — VO2max and all-cause mortality
- Pedersen & Saltin — *Exercise as medicine*
- Garber et al. — ACSM Position Stand (2011)
- Murphy et al. — walking and post-prandial glucose
- Westcott — resistance training and metabolic health
